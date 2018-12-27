let fs = require('fs');
let grpc = require('grpc');
let lnrpc = grpc.load('rpc.proto').lnrpc;
process.env.GRPC_SSL_CIPHER_SUITES = 'HIGH+ECDSA';
let lndCert = fs.readFileSync('/home/ubuntu/.lnd/tls.cert');
let sslCreds = grpc.credentials.createSsl(lndCert);
let macaroonCreds = grpc.credentials.createFromMetadataGenerator(function(args, callback) {
    let macaroon = fs.readFileSync("/home/ubuntu/.lnd/data/chain/bitcoin/testnet/admin.macaroon").toString('hex');
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
app.use(cors())

let corsOptions = {
  origin: 'http://paywall-demo.s3-website-us-west-2.amazonaws.com',
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

let port = 7777;
app.set('port', (process.env.PORT || port));

//ssl verification
let  options = {  
	    key: fs.readFileSync('./key.pem', 'utf8'),  
	    cert: fs.readFileSync('./server.crt', 'utf8')  
}

const httpsPort = 7777;

let http = require('http');
let https = require('https');

let forceSsl = require('express-force-ssl');

app.use(forceSsl);
let secureServer = https.createServer(options, app).listen(httpsPort, () => {  
	    console.log(">> Got Code? listening in the interwebz...");  
});

require('events').EventEmitter.defaultMaxListeners = Infinity;

/*ssl verification
app.get('/.well-known/acme-challenge/-DD9QKlqwO3PMLE0EOFXKgOq_bCSIq6b8LFps9LwpoY',function (req, res){
    res.send("-DD9QKlqwO3PMLE0EOFXKgOq_bCSIq6b8LFps9LwpoY.LdNxK9E6CMW5qJyQ6l2sezkKbYpj1mnaJzdoCfvGWLs")
});*/

// Home page
app.get('/',function (req, res) {
    console.log("Home page loaded.")
    
    let request = {
        memo: "Got Code",
        value: 10,
    }

    lightning.addInvoice(request, (err,response) => {
        let invoice = response.payment_request;
        lightning.decodePayReq(invoice, function(err, response){
            let hash = response.payment_hash;
            res.send(html1+'window.open("/cs1/'+hash+html+invoice+html2); 
        })
        
        
        
    });
    
});

//working on sending payment
app.get('/okane/:payReq', (req, res) => {
});

app.get('/verify/:Hash', cors(corsOptions), (req, res) => {
    data = req.params;
    payment = data.Hash;
    
    var request = { 
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

//upload functionality for ERS project
app.post('/receipts', upload.single('receipt'), function(req, res, next){
    console.log("got new upload")
    res.sendStatus(200);
})

// Get the balance of the lightining node
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

    lightning.addInvoice(request, (err,response) => {
        let invoice = response.payment_request;
        lightning.decodePayReq(invoice, function(err, response){
            let hash = response.payment_hash;
            res.send(`{"invoice":"${invoice}",
	               "hash":"${hash}"}`);
	     });
	});
    })

// Listen for payment on the paywall demo
app.get('/listen/:payReq', cors(corsOptions), (req, res) => {
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

        /*user for running on on http or local testing
      app.listen(port, '0.0.0.0', (err) => {
        console.log(`Listening on port ${port}`);
       })*/ 	
   
