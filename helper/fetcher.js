const fetch = require('fetch')
const cheerio = require('cheerio')                  //크롤링을 위한 모듈
const moment = require('moment')
const uuid = require('uuid')

const db = require('./mysql')

function NaverRightsideFetcher(){
    return new Promise((resolve,reject) => {
        fetch.fetchUrl("https://news.naver.com/main/home.nhn", async function(error, meta, body){
            let conn = await db.connection()
            const $ = cheerio.load(body);

            let channelinfoQ = "SELECT * FROM CHANNEL WHERE channel_name = 'NAVER_News_Main'"
            let channelinfo = (await conn.query(channelinfoQ))[0][0]


            //해당 페이지에서 이전에 크롤링 했던 데이터 관련 튜플 삭제
            await conn.query("UPDATE ARTICLE_DATA SET state = 'T'" +
                " WHERE article_id in (SELECT id FROM ARTICLE WHERE channel_id = (SELECT id FROM CHANNEL " +
                "WHERE CHANNEL.id = '" + channelinfo.id + "'))")

            await conn.query("UPDATE ARTICLE SET state = 'T' WHERE channel_id = '" + channelinfo.id + "'")


            $("#container > div.main_aside > div.section.section_wide > div").each(async function(index, obj){

                if(index>=2) {
                    let keyword = $(this).find("h5").text()
                    let num = 0;
                    let article_id = uuid.v4();

                    console.log(keyword)
                    $(this).find("ul > li ").each(async function (idx, obj) {
                        let title = $(this).find("a").text();
                        let link = "https://news.naver.com" + $(this).find("a").attr("href")
                        num++
                        let Article_dataQ = "INSERT INTO ARTICLE_DATA(id, title, link, article_id, state, created_date, updated_Date)" +
                            " VALUES(?, ?, ?, ?, 'C', now(), now())"
                        await conn.query(Article_dataQ, [uuid.v4(), title, link, article_id]);

                    })
                    let ArticleQ = "INSERT INTO ARTICLE(id, title, length, channel_id, state, created_date, updated_date)" +
                        " VALUES(?, ?, ?, ?,'C', now(), now())"
                    await conn.query(ArticleQ, [article_id, keyword, num, channelinfo.id])
                }
            })
            conn.release()
            console.log("성공")
            resolve("Success");
        });
    })
}

function CauFetcher()
{
    return new Promise((resolve,reject) => {
        fetch.fetchUrl("http://sw.cau.ac.kr/board_list.php?part=board01", async function(error, meta, body){
            let conn = await db.connection()
            const $ = cheerio.load(body);

            //let channelinfoQ = "SELECT * FROM CHANNEL WHERE channel_name = 'NAVER_News_Main'"
            //let channelinfo = (await conn.query(channelinfoQ))[0][0]


            //해당 페이지에서 이전에 크롤링 했던 데이터 관련 튜플 삭제
            //await conn.query("UPDATE ARTICLE_DATA SET state = 'T'" +
             //   " WHERE article_id in (SELECT id FROM ARTICLE WHERE channel_id = (SELECT id FROM CHANNEL " +
             //   "WHERE CHANNEL.id = '" + channelinfo.id + "'))")

            //await conn.query("UPDATE ARTICLE SET state = 'T' WHERE channel_id = '" + channelinfo.id + "'")


            let contents = $("#wrap > div.container > div > div.right_area > div.tbl_03 > table > tbody")

            $(contents).find("tbody > tr > td.left > a").each(async function (idx, obj) {
                console.log($(obj).text())

            })

            await conn.query("INSERT INTO ARTILCE")
            console.log("성공")
            resolve("Success");
        });
    })

}

function ThinkgoodFetcher()
{
    return new Promise((resolve,reject) => {
        fetch.fetchUrl("https://www.thinkcontest.com/", async function(error, meta, body){
            let conn = await db.connection()
            let $ = cheerio.load(body);
            let channel = (await conn.query("SELECT * FROM CHANNEL WHERE channel_name = 'THINK_GOOD'"))[0][0]

            let links = []
            let articleTitle = []
            $('#aside > div.cate-box > ul.cate-list.col-2.cate-list-1.on > li').each(async function(idx, obj) {
                let link = 'https://www.thinkcontest.com/' + $(obj).find('a').attr('href')
                let text = $(obj).text().replace(/\t/g,'').replace(/\n/g,'')
                articleTitle.push(text);
                links.push(link)

            })

            for(let i = 0; i<links.length;i++)
            {
                let articleid = uuid.v4();
                let length = 0;
                 fetch.fetchUrl(links[i], async function(err, meta, body){
                 $ = cheerio.load(body)

                 $('#main > div > div.body.contest-cate > div > table > tbody > tr').each(async function(idx, obj){
                     let link = 'https://www.thinkcontest.com' + $(obj).find('a').attr('href')
                     let title = $(obj).find('a').text();
                     length++;

                     let articleQ = "INSERT INTO ARTICLE_DATA(id, title, link, article_id, state, created_date, updated_date) "+
                                    "VALUES(?, ?, ?, ?, ? ,now() ,now())"
                     await conn.query(articleQ,[uuid.v4(), title, link, articleid, 'C'])

                   })
                 })

                let insertQ = "INSERT INTO ARTICLE(id, title, channel_id, state, length, created_date, updated_date)"+
                            "VALUES(?, ?, ?, ?, ?, now(), now())"
                await conn.query(insertQ,[articleid,articleTitle[i],channel.id,'C',length])
            }
            conn.release()
        });
    })

}

module.exports.NaverRightsideFetcher = NaverRightsideFetcher
module.exports.CauFetcher = CauFetcher
module.exports.ThinkgoodFetcher = ThinkgoodFetcher