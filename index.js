let fs = require('fs');
let grpc = require('grpc');
let lnrpc = grpc.load('rpc.proto').lnrpc;
process.env.GRPC_SSL_CIPHER_SUITES = 'HIGH+ECDSA';
let lndCert = fs.readFileSync('/home/ubuntu/.lnd/tls.cert');
let sslCreds = grpc.credentials.createSsl(lndCert);
let macaroonCreds = grpc.credentials.createFromMetadataGenerator(function(args, callback) {
    let macaroon = fs.readFileSync("/home/ubuntu/.lnd/data/chain/bitcoin/mainnet/admin.macaroon").toString('hex');
    let metadata = new grpc.Metadata()
    metadata.add('macaroon', macaroon);
    callback(null, metadata);
  });
//credentials for lightning network node
let creds = grpc.credentials.combineChannelCredentials(sslCreds, macaroonCreds);
let express = require('express');
//for testing lnd connection
let lightning = new lnrpc.Lightning('localhost:10009', creds);
//let request = {};
//lightning.walletBalance(request, function(err, response) {
//    console.log(response);
//  });  
let app = express();
// Files for server hosting and testing
let html = (fs.readFileSync('index.html').toString());
let html1 = (fs.readFileSync('index1.html').toString());
let html2 = (fs.readFileSync('index2.html').toString());
let news  = (fs.readFileSync('news.html').toString());
let cs1snip  = (fs.readFileSync('cs1.html').toString());
let cs2snip  = (fs.readFileSync('cs2.html').toString());
let cs3snip  = (fs.readFileSync('cs3.html').toString());
let redirect  = (fs.readFileSync('redirect.html').toString());
let sleep = require('sleep');
let cmd = require('node-cmd')

// Middleware for uploading functionality
let multer = require('multer')
let upload = multer({ dest: 'projectOneReceipts'})
let cors = require('cors')

//add http://localhost:3000 when testing locally
let whitelist = ['https://pop-server.hopto.org', 'https://proof-of-plays.com', 
                 'https://proofofplays.hopto.org', 'http://proofofplays.hopto.org','http://proof-of-plays.com']

let corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}

// SSL certificate error handling
require('https').globalAgent.options.ca = require('ssl-root-cas/latest').create();

// set port for ssl verification
let port = 7777;
app.set('port', (process.env.PORT || port));

//ssl verification
let  options = {  
	    key: fs.readFileSync('./key.pem', 'utf8'),  
	    cert: fs.readFileSync('./server.crt', 'utf8')  
}

// set port for https
const httpsPort = 7777;

let http = require('http');
let https = require('https');

/* Comment forceSsl and secureServer to renew certs on http
ensure /etc/nginx/nginx.conf has correct ip of ec2
forward port 7777 to port 80*/
let forceSsl = require('express-force-ssl');

app.use(forceSsl);
let secureServer = https.createServer(options, app).listen(httpsPort, () => {  
	    console.log(">> Got Code? listening in the interwebz...");  
});


require('events').EventEmitter.defaultMaxListeners = Infinity;

// ssl verification
app.get('/.well-known/acme-challenge/NTyj9-NA-LGDBpMrVCNWZaJeqFU4lFfZxeA-zTmxs7o',function (req, res){
    res.send("NTyj9-NA-LGDBpMrVCNWZaJeqFU4lFfZxeA-zTmxs7o.fM7p8OXU4V8uOLbTZWb8J74Sk1Hsre1JjowjEN5MAiA")
});

// Home page
app.get('/',function (req, res) {
    console.log("Home page loaded.")
    
    let request = {
        memo: "Got Code",
        value: 10,
    }
        //ip logging for malicious actor tracing
	ip = req.ip.split(":");
	console.log(ip[3])
    // lightning.addInvoice(request, (err,response) => {
        // let invoice = response.payment_request;
        // lightning.decodePayReq(invoice, function(err, response){
            // let hash = response.payment_hash;
          // home page testing  
	  // res.send(html1+'window.open("/cs1/'+hash+html+invoice+html2); 
          // res.send("Lightpoll payment server is running")
	  res.send("LND mainnet server is online")
	//})        
   // });
    
});

//working on sending payment
app.get('/okane/:payReq', (req, res) => {
 
  //ip logging for malicious actor tracing
  ip = req.ip.split(":");
  console.log(ip[3])
  valid = ip[3]
  if(valid === '34.215.137.184'){

    let pr = req.params.payReq	
    let request = {
      payment_request: pr
    }
  
    lightning.sendPaymentSync(request, function(err, response) {
      if(err){
        res.send(err);
      }
      res.send(response);
    });
  } 
});

app.get('/info', cors(corsOptions), (req, res) => {
 let request = {} 
 lightning.getInfo(request, function(err, response) {
    res.send(response)
  })
})

app.get('/decode/:payReq', (req, res) => {
  
  //ip logging for malicious actor tracing
  ip = req.ip.split(":");
  console.log(ip[3])
   
  let pr = req.params.payReq
  let request = { 
    pay_req: pr
  } 

  lightning.decodePayReq(request, function(err, response) {
    if(err){
      res.send(err);
    }
  
    res.send(response);
  });
});

app.get('/verify/:Hash',  (req, res) => {
    data = req.params;
    payment = data.Hash;
    
    let request = { 
        r_hash_str: payment
      }
      lightning.lookupInvoice(request, function(err, response) {
                res.send(response);
            
  });
        
   
});

app.get('/cs1/:Hash', (req, res) => {
    data = req.params;
    payment = data.Hash;
    
    var request = { 
        r_hash_str: payment,
      }
      lightning.lookupInvoice(request, function(err,    response) {
            if(response.settled===true){
                res.send(cs1snip);
            }  else if (response.settled!==true){
                res.send("<script>window.open('/','_self')</script>")
            }        
  });
        
      //res.send("debugging")
   
});



app.get('/cs2', (req, res) => {
    console.log("Snippet 2 has been accessed.")

        res.send(cs2snip);
});

app.get('/cs3', (req, res) => {
    console.log("Snippet 3 has been accessed.")

        res.send(cs3snip);
});      

app.get('/news', (req, res) => {
    console.log("News page loaded.")
   
        res.send(news);
});

/*upload functionality for ERS project
app.post('/receipts', upload.single('receipt'), function(req, res, next){
    console.log("got new upload")
    res.sendStatus(200);
})*/

// Get the balance of the lightning node
app.get('/balance', (req, res) => {
    let request = {}
    lightning.channelBalance(request, function(err, response) {
    res.send(response)
  });
});

// Generate invoices
app.get('/invoice/:memo/:value', cors(corsOptions), (req, res) => {
    data = req.params
    value = data.value
    memo = data.memo

    let request = {
        memo: memo,
        value: value,
    }

    lightning.addInvoice(request,  (err,response) => {
        let invoice = response.payment_request;
        lightning.decodePayReq(invoice, function(err, response){
            let hash = response.payment_hash;
            res.send(`{"invoice":"${invoice}",
	               "hash":"${hash}"}`);
	     });
	});
    })

// Listen for payment, subscribe invoices
app.get('/listen/:payReq',cors(corsOptions), (req, res) => {
    data = req.params
    payReq = data.payReq

   let call = lightning.subscribeInvoices()
  call.on('data', function(response) {
    // A response was received from the server.
        if(response.payment_request === payReq){
	    console.log(response);
	    fs.writeFileSync('restart.txt','restarting');
            console.log("restarting server...")

            res.send(response)
             
           cmd.run('forever restart index.js')
	 }

  });
  call.on('status', function(status) {
    // The current status of the stream.
  });
  call.on('end', function() {
    // The server has closed the stream.
  });
	fs.writeFileSync('restart.txt','restarting');
	console.log("restarting server...")
})

        /* use for running on on http or local testing
      app.listen(port, '0.0.0.0', (err) => {
        console.log(`Listening on port ${port}`);
       })*/	
   
