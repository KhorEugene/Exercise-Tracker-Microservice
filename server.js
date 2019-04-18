const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track',{useNewUrlParser:true})

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Not found middleware
const notFound=function(){
  app.use((req, res, next) => {
    next({status: 404, message: 'not found'})
  })
}

// Error Handling middleware
const handleError=function(){
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})
}
const Schema = mongoose.Schema;
const userSchema = new Schema({
  username: {type:String,required:true},
  log: [{}]
});
const userModel = mongoose.model('userMode',userSchema);
const createAndSaveUserAndGetId=function(username,res){
  const userDoc = new userModel({
    username: username
  });
  userDoc.save(function(err,data){
    if(err){
      return console.log(err);
    }
    console.log('New document created and saved with username '+data.username+'.');
    userModel.findOne({"username":username},'username _id',function(err,data){
        res.json(data);
      console.log('Id and username retrieved and served hot.')
    });
  })
}
const updateLog = function(id,date,description,duration,res){
  let newDate = new Date(date);
  const logItem = {"date":newDate,"description":description,"duration":duration};
  userModel.findOne({"_id":id},function(err,data){
    if(err) {
     return console.log(err); 
    }
    data.log.push(logItem);
    data.save();
    console.log('User data updated with data dated '+newDate+'.');
    res.send({'userId':id,'username':data.username,'Date':newDate,'Description':description,'Duration':duration});
  }) 
  
}

//add new user (filter out existing ones as well)
app.post('/api/exercise/new-user',(req,res,next)=>{
  userModel.findOne({'username':req.body.username},'username _id',function(err,data){
    if(err){
      return console.log(err);
    }
    if(data==null){
      createAndSaveUserAndGetId(req.body.username,res);
      return console.log('New user document request for '+req.body.username+' created.');
      
    }
    console.log('User '+req.body.username+' already exists.');
    console.log('Id and username retrieved and served cold.');
    res.json(data);
  });
});

//get list of users
app.get('/api/exercise/users',(req,res,next)=>{
  userModel.find({},'username _id',function(err,data){
    res.json(data);
  });
});

app.post('/api/exercise/add',(req,res,next)=>{
  let date = req.body.date;
  if(req.body.userId==""){
   return res.send('Error: Please enter a date!'); 
  }
  if(req.body.description==""){
   return res.send('Error: Please enter a description!'); 
  }
  if(req.body.duration==""){
   return res.send('Error: Please enter an exercise duration!'); 
  }
  if(date==""){
   const d = new Date();
    let month;
    if(d.getMonth()<10){
      month = '0'+d.getMonth();
    } else{
      month = d.getMonth();
    }
    date = d.getFullYear()+'-'+month+'-'+d.getDate();
  }
  if(date.split('-')[0].length!==4||date.length!==10){
    return res.send('Error: Invalid date format!');
  }
  if(isNaN(req.body.duration)){
   return res.send('Error: Please enter a valid number!'); 
  }
  userModel.findOne({"_id":req.body.userId},'username _id',function(err,data){
    if(data==undefined){
      return res.send('UserId not found in database. Please create new account and username.')
    }
  updateLog(req.body.userId,date,req.body.description,req.body.duration,res);
  })
});

app.get('/api/exercise/log?',function(req,res,next){
  let from;
  let to;
  let limit;
  let logArray = [];
  if(req.query.from==undefined){
    from = '0000-01-01';
  } else {
    from = req.query.from;
    if(from.split('-')[0].length!==4||from.length!==10){
      return res.send('Error: Invalid from date format!');
    }
  }
  from = new Date(from);
  if(req.query.to == undefined){
    to = '9999-12-28'; 
  } else {
    to = req.query.to;
    if(to.split('-')[0].length!==4||to.length!==10){
      return res.send('Error: Invalid to date format!');
    }
  }
  to = new Date(to);
  if(req.query.userId==undefined){
   return res.send('Please specify userId in the query string!'); 
  }
  if(req.query.limit==undefined){
   limit=999999999; 
  } else {
  limit=req.query.limit;
  }
  if(isNaN(limit)){
   return res.send('Error: Please enter a valid number in the query string for limit!'); 
  }
  userModel.findOne({"_id":req.query.userId},function(err,data){
    if(data==undefined){
      return res.send('Error: UserId does not exist in database. Try correcting the userId in the query string or creating an account.')
    }
    data.log.forEach(function(val){
      if(val.date>=from&&val.date<=to){
        logArray.push(val);
      }
    })
    logArray.sort(function(arg1,arg2){
      return arg1.date-arg2.date;
    })
    logArray=logArray.slice(0,limit);
    res.json({"_id":data["_id"],"username":data.username,"count":logArray.length,"log":logArray});
  })
});

app.get('/test',function(req,res,next){
  let date1 = new Date('9999-12-30');
  let date2 = new Date('0000-01-31');
  const arr = [{date:date1},{date:date2}];
  arr.sort(function(ar1,ar2){
    return ar1.date-ar2.date;
  })
  console.log(arr);
  res.send(arr);
  
})

//backend listener
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
