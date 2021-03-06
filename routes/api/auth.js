const router = require('express').Router()
const helper = require('../../helper/helper')
const promiseHandler = require('../../helper/promiseHandler')
const db = require('../../helper/mysql')
const uuid = require('uuid')
const validator = require("email-validator");
const passport = require('passport')

router.post('/dupemail',helper.asyncWrapper(async (req,res) => {

    let conn = await db.connection()
    let email = req.body.email
    let exist = (await conn.query("SELECT * FROM USER WHERE email = '" + email + "'"))[0][0]
    let test = validator.validate(email)
    if(exist != null || !test)
    {
        res.json({
            statusCode: 700
        })
        conn.release
        return
    }
    else
    {
        res.json({
            statusCode: 200
        })
        conn.release
        return
    }
}))

router.post('/dupnick',helper.asyncWrapper(async (req,res) => {

    let conn = await db.connection()
    let nickname = req.body.nickname
    let exist = (await conn.query("SELECT * FROM PROFILE WHERE nickname = '" + nickname + "'"))[0][0]

    if(exist != null)
    {
        res.json({
            statusCode: 700
        })
        conn.release
        return
    }
    else
    {
        res.json({
            statusCode: 200
        })
        conn.release
        return
    }
}))

router.post('/signup',helper.asyncWrapper(async (req, res) => {

    let conn = await db.connection()

    let email = req.body.email
    let password = req.body.password
    let nickname = req.body.nickname
    let name = req.body.name

    let obj = await promiseHandler.cryptoPassword(password)
    let salt = obj[0]
    let hashed_password = obj[1]
    let profile_id = uuid.v4()
    let insertQ = "INSERT INTO USER(id, email, state, profile_id, salt, password ,created_date, updated_date) " +
                    "VALUES(?, ?, 'C', ?, ?, ?, now(), now())"
    let profileQ = "INSERT INTO PROFILE(id, user_name, nickname, state, created_date, updated_date) " +
                    "VALUES(?, ?, ?, ?, now(), now())"
    await conn.query(insertQ,[uuid.v4(), email, profile_id, salt, hashed_password])
    await conn.query(profileQ,[profile_id, name, nickname, 'C'])
    res.redirect('/login')

}))

router.post('/signin',helper.asyncWrapper(async (req, res) => {

    let conn = await db.connection()

    let useremail = req.body.email
    let password = req.body.password

    if(useremail == undefined || password == undefined)
    {
        conn.release();
        res.render('login',{err:1})
        res.end()

    }
    let userinfoQ = "SELECT * FROM USER WHERE email = ?"
    let userinfo = (await conn.query(userinfoQ, [useremail]))[0][0]

    if (userinfo == null) {

        conn.release();
        res.render('login',{err:1})
        res.end()
    }

    if (userinfo.password == await promiseHandler.getHashedPassword(password, userinfo.salt)){

        req.session.user = {
            id: userinfo.id,
            email:userinfo.email,
            nickname: userinfo.nickname,
            authorized: true
        };
        conn.release();
        res.redirect('/main')
        res.end()
    }
    else
    {
        conn.release();
        res.render('login',{err:1})
    }
}))

router.get('/logout',helper.asyncWrapper(async (req,res) =>{

    req.session.destroy()
    res.redirect('/')
    res.end()

}))

function ensureAuthenticated(req, res, next) {

    // 로그인이 되어 있으면, 다음 파이프라인으로 진행

    if (req.isAuthenticated()) { return next(); }

    // 로그인이 안되어 있으면, login 페이지로 진행

    res.redirect('/');

}
router.get('/facebook', passport.authenticate('facebook'))

router.get('/facebook/callback', passport.authenticate('facebook',{
    successRedirect: '/api/auth/login_success',
    failureRedirect: '/login_fail'
}))

router.get('/login_success',  ensureAuthenticated,helper.asyncWrapper(async (req,res) =>{

    let conn = await db.connection()
    let userInfo = req.user._json
    let email = userInfo.email
    // OAuth로 기존에 접근했던 유저일 경우 바로 로그인 시킴
    let user = (await conn.query("SELECT * FROM USER WHERE id = ?",[userInfo.id]))[0][0]

    if(user !=null)
    {
        req.session.user = {
            id: userInfo.id,
            email:userInfo.email,
            nickname: userInfo.nickname,
            authorized: true
        };
        res.redirect('/main')
        res.end()
        return
    }

    // OAuth로 처음 접근하는 유저일 경우

    if(email == null)// 유저 페이스북 정보에 이메일이 없을경우
    {
        res.render('setEmail')
        res.end()
        return
        //이메일 입력페이지로 이동

    }else//유저 페이스북 정보에 이메일이 있을경우
    {
        let exist = (await conn.query("SELECT * FROM USER WHERE email = ?",[email]))[0][0]
        console.log(exist)
        if(exist != null) //중복이메일일 경우
        {// 이메일 입력 페이지로 이동

            res.render('setEmail')
            res.end()
            return
        }
        else //처음 접근하고 중복이메일이 아닐경우
        {
            // 레코드를 추가하고 로그인 시킴(세션을 유지함)
            console.log("여기")
            let profile_id = uuid.v4()
            let insertQ = "INSERT INTO USER(id, email, state, profile_id, provider_type, created_date, updated_date) " +
                        "VALUES(?, ?, 'C', ?, 1, now(), now())"
            let profileQ = "INSERT INTO PROFILE(id, nickname, state, created_date, updated_date) " +
                            "VALUES(?, ?, ?, now(),now())"
            await conn.query(insertQ,[userInfo.id, userInfo.email,profile_id])
            await conn.query(profileQ,[profile_id, userInfo.email,'C'])
            req.session.user = {
                id: userInfo.id,
                email:userInfo.email,
                nickname: userInfo.nickname,
                authorized: true
            };
            console.og
            res.redirect('/main')
            res.end()
            return
        }
    }

}))

router.post('/setEmail', helper.asyncWrapper(async (req,res) =>{

    let conn = await db.connection()

    let userInfo = req.user._json
    let email = req.body.email
    let profile_id = uuid.v4()
    let insertQ = "INSERT INTO USER(id, email, profile_id,state, provider_type, created_date, updated_date) " +
        "VALUES(?, ?, ?, 'C', 1, now(), now())"
    let profileQ = "INSERT INTO PROFILE(id, nickname, state, created_date, updated_date) " +
        "VALUES(?, ?, ?, now(),now())"

    await conn.query(insertQ,[userInfo.id, email,profile_id])
    await conn.query(profileQ,[profile_id, userInfo.id,'C'])

    req.session.user = {
        id: userInfo.id,
        email:email,
        nickname: userInfo.nickname,
        authorized: true
    };
    res.redirect('/main')
    res.end()
    return

}))

module.exports = router;