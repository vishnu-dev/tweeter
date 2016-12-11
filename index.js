var express = require('express');
var exphbs  = require('express-handlebars');
var bparse = require('body-parser');
var mongoose = require('mongoose');
var session = require('express-session');
var multer = require('multer');

var app = express();

//Listening port
app.listen(3000);
//console.log('Listening at port'+process.env.PORT);
console.log('Listening at port'+3000);
//Handlebars init
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

// Body-parser init
app.use(bparse.urlencoded({ extended: false }));
app.use(bparse.json());

// Static elements
app.use('/uploads', express.static(__dirname + '/uploads'));

// Mongoose database
mongoose.connect('mongodb://vishnudev:87laugh56@ds151117.mlab.com:51117/usersystem');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log('LOGGED | MongoDB Connected - ' + new Date());
});

// Models
// User Collection
var UserSchema = mongoose.Schema({
    name: String,
    uname: String,
    pass: String,
    email: String,
    conf: String,
    fname: String,
});
var User = mongoose.model('users', UserSchema);

// Tweets collection
var TweetSchema = mongoose.Schema({
    name: String,
    tweet: String,
    pic: String
});
var Tweeter = mongoose.model('tweets', TweetSchema);

// Session
app.use(session({
    secret:"<your_secret_key>",
    resave:true,
    saveUninitialized:false
}));

// Routers
var routerPublic = express.Router();
var routerLoggedin = express.Router();

// Middlewares
routerPublic.use(function (req, res, next) {
    next();
});
routerLoggedin.use(function (req, res, next) {
    if(typeof req.session.user == 'undefined') {
        res.render('start',{msgl:req.query});
    } else {
        next();
    }
});

// Multer
var multipartUpload = multer({storage: multer.diskStorage({
    destination: function (req, file, callback) { callback(null, './uploads');},
    filename: function (req, file, callback) { callback(null, file.originalname);}})
}).single('upfile');

// Routes

// Homepage
/*routerPublic.get('/', function (req,res) {
    if(typeof req.session.user == 'undefined') {
        res.render('start');
    }
});*/
// HomePages
routerLoggedin.get('/', function (req, res) {
    // var x = req.session.user;
    if(req.session.user.name) {
        Tweeter.find((error, document) => {
            if (error) {
                throw error;
            }
            else {
            	var m = req.query.message;
                var allarr = [], i;
                console.log(m);
                for (i = 0; i < document.length; i++) {
                    allarr.push({name:document[i].name,tweet:document[i].tweet,filea:document[i].pic});
                }
                res.render('home', {name:req.session.user.name,tweets: allarr.reverse(),m:m});
            }
        });
    }
});

// SignupPage
routerPublic.get('/signup', function (req, res) {
	res.render('signup');
});

// Signup DB Post
routerPublic.post('/signup',multipartUpload, function (req, res, next) {
    console.log(req.file);
    var newUser = new User({
        name:req.body.name,
        email: req.body.email,
        pass: req.body.password,
        conf: req.body.confirm,
        fname:req.file.filename
    });
    console.log(newUser);
    newUser.save();
    // console.log(userId);
    res.redirect('/login');
});

// Login Page
routerPublic.get('/login', function (req, res) {
    if(req.session.user)
        res.render('login',{loginerr:req.session.user.name});
    else
        res.render('login');
});

// Login validation
routerPublic.post('/login', function(req, res) {
    User.findOne({email : req.body.email},(error, document) => {
        if (error) {
            throw error;
        }
        else {
            if (!document) {
                res.render('login',{msgu:req.query});
                /*res.redirect('/login/?message='+message);*/
            }
            else {
                if (document.pass != req.body.password) {
                    // res.redirect('/login/?message='+encodeURIComponent(message));
                    res.render('login',{msgup:req.query});
                }
                else {
                    req.session.user = document;
                    res.redirect('/?message='+encodeURIComponent('Logged in successfully!'));
                }
            }
        }
    });
});

// About
routerLoggedin.get('/about', function (req, res) {
    if(req.session.user)
        res.render('about',{name:req.session.user.name});
});

// Upload page
routerLoggedin.get('/upload', function (req, res) {
    if(req.session.user) {
        res.render('upload', {name: req.session.user.name});
    }
    else
        res.render('upload');
});
// Upload file store
routerLoggedin.post('/upload',multipartUpload,function(req,res) {
    console.log(req.file);
    User.findOne({name: req.session.user.name}, (error, document) => {
        if (error) {
            throw error;
        }
        else {
            document.fname = req.file.originalname;
            document.save();
            console.log(document);
        }
    });
    res.redirect('/download');
});

//Download page
routerLoggedin.get('/download', function (req, res) {
    if(req.session.user) {
        User.findOne({name: req.session.user.name}, (error, document) => {
            if (error) {
                throw error;
            }
            else {
                    res.render('download', {name: req.session.user.name, filenamed: document.fname});
            }
        });
    }
    else
        res.render('download');
});
routerLoggedin.post('/download', function (req, res) {
    User.findOne({name: req.session.user.name}, (error, document) => {
        if (error) {
            throw error;
        }
        else {
            var path = './uploads/' + document.fname;
            res.download(path);
        }
    });
});
// Tweet page
routerLoggedin.get('/tweet', function (req,res) {
    res.render('tweet',{name:req.session.user.name});
});
routerLoggedin.post('/tweet', function (req,res) {
    var nam = req.session.user.name;
    Tweeter.findOne({name: nam},(error, document) => {
        if (error) {
            throw error;
        }
        else {
            var x = new Tweeter({
                name:nam,
                tweet:req.body.text,
                pic:req.session.user.fname
            });
            x.save();
            res.redirect('/');
        }
    });
});
routerLoggedin.get('/mytweets', function (req,res) {
    Tweeter.find({name: req.session.user.name},(error, document) => {
        if (error) {
            throw error;
        }
        else {
            var arr = [],i;
            for(i=0;i<document.length;i++){
                arr.push(document[i].tweet);
            }
            res.render('mytweets',{name:req.session.user.name,tweets:arr});
        }
        console.log(arr);
    });
});
// Logout
routerLoggedin.get('/logout', function (req, res) {
    req.session.destroy(function(err) {
        res.redirect('/login');
    })
});
app.use(routerPublic);
app.use(routerLoggedin);
