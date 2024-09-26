const axios = require('axios');
const cheerio = require('cheerio');
const RSS = require('rss');
const fs = require('fs');
const crypto = require('crypto');

// 用于生成唯一ID的函数
function generateUniqueId(title, date) {
  return crypto.createHash('md5').update(`${title}${date.toISOString()}`).digest('hex');
}

// 用于解析日期字符串的函数
function parseDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

async function generateRSSFeed() {
  const url = 'https://www.cnnic.net.cn/11/38/208/index.html';
  const feedUrl = 'https://example.com/cnnic_news.xml'; // 替换为您实际的feed URL
  const outputFile = 'cnnic_news.xml';

  try {
    // 获取网页内容
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // 创建新的RSS feed
    const feed = new RSS({
      title: 'CNNIC 新闻动态',
      description: '中国互联网络信息中心新闻动态',
      feed_url: feedUrl,
      site_url: 'https://www.cnnic.net.cn',
      language: 'zh-CN'
    });

    // 从网页提取新闻项目
    const newsItems = $('ul li').map((index, element) => {
      const text = $(element).text().trim();
      const match = text.match(/(.*)\s(\d{4}-\d{2}-\d{2})/);
      if (match) {
        const title = match[1].trim();
        const date = parseDate(match[2]);
        return { title, date, id: generateUniqueId(title, date) };
      }
      return null;
    }).get().filter(item => item !== null);

    // 读取现有的RSS feed（如果存在）
    let existingItems = [];
    if (fs.existsSync(outputFile)) {
      const existingXml = fs.readFileSync(outputFile, 'utf8');
      const existingFeed = new RSS(existingXml);
      existingItems = existingFeed.items.map(item => ({
        title: item.title,
        date: new Date(item.date),
        id: item.guid
      }));
    }

    // 合并现有项目和新项目，去除重复
    const allItems = [...existingItems, ...newsItems];
    const uniqueItems = allItems.reduce((acc, current) => {
      const x = acc.find(item => item.id === current.id);
      if (!x) {
        return acc.concat([current]);
      } else {
        return acc;
      }
    }, []);

    // 按日期排序，最新的在前
    uniqueItems.sort((a, b) => b.date - a.date);

    // 将唯一项目添加到feed中
    uniqueItems.forEach(item => {
      feed.item({
        title: item.title,
        url: url,
        guid: item.id,
        date: item.date
      });
    });

    // 生成RSS feed
    const xml = feed.xml({ indent: true });
    
    // 保存 RSS feed 到本地文件
    fs.writeFileSync('index.xml', xml);
    console.log('RSS feed has been updated and saved to index.xml');
  } catch (error) {
    console.error('Error generating RSS feed:', error);
  }
}

generateRSSFeed();
