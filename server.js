const express = require('express');
const bodyParser = require('body-parser');
const app = express();
var axios = require('axios');
const mysql = require('mysql');
const fetch = require('node-fetch');
var js2xmlparser = require("js2xmlparser");
const USER_TOKEN = "";

const AuthStr = 'Bearer '.concat(USER_TOKEN);

// parse application/json
app.use(bodyParser.json());


//create database connection
const conn = mysql.createConnection({
  host: '',
  user: '',
  password: '',
  database: ''
});


//connect to database
conn.connect((err) =>{
  if(err) throw err;
  console.log('Mysql Connected...');
});

//##############################################################################################################################
// retorna todoas as encomendas
app.get('/api/getAllOrders',(req, res) => {

   const URL = 'https://my.jasminsoftware.com/api/225185/225185-0002/sales/orders';
   
   axios.get(URL, 
       { headers: { Authorization: AuthStr } })
    .then(response => {
      res.send(response.data);
    })
    .catch((error) => {
      console.log(error)
    })

});

//##############################################################################################################################
// retorna o stock do produto que foi feito encomenda
app.get('/api/getStockLastOrder',(req, res) => {
  
  let sql = "SELECT * FROM encomenda ORDER BY idencomenda DESC";
   let query = conn.query(sql,(err, results) => {
    if(err) throw err;
    
    var idEncomenda = results[0].novaencomenda;

    const URL = 'https://my.jasminsoftware.com/api/225185/225185-0002/sales/orders/' + idEncomenda;
    
    axios.get(URL, 
        { headers: { Authorization: AuthStr } })
      .then(response => {
        var quantidade = response.data.documentLines[0].quantity;
        var item = response.data.documentLines[0].salesItem;
        var stockJasmin = "https://my.jasminsoftware.com/api/225185/225185-0002/materialsCore/materialsItems/" + item + "/extension"
		
        getStockBalance(stockJasmin, quantidade)

      })
      .catch((error) => {
        console.log(error)
      })

  });

   function getStockBalance(link, qtd){

     axios.get(link, 
      { headers: { Authorization: AuthStr } })
      .then(response => {
		// NOVA VERIFICAÇÃO 
        if (qtd > response.data.materialsItemWarehouses[0].stockBalance) {
			res.send({"estadoEncomenda": "AGUARDA STOCK"});
		}
		else {
			res.send({"estadoEncomenda": "PREPARAÇÃO"});
		}
        //res.send({"stockBalance": response.data.materialsItemWarehouses[0].stockBalance});
    
      })
      .catch((error) => {
        console.log(error)
      })
      
  }

});


//##############################################################################################################################
app.get('/api/getLastOrderXML',(req, res) => {
  
  let sql = "SELECT * FROM encomenda ORDER BY idencomenda DESC";
   let query = conn.query(sql,(err, results) => {
    if(err) throw err;
    
    var idencomenda = results[0].novaencomenda;

    const URL = 'https://my.jasminsoftware.com/api/225185/225185-0002/sales/orders/' + idencomenda;
    
    axios.get(URL, 
        { headers: { Authorization: AuthStr } })
      .then(response => {
    
        //res.send(response.data);
        res.send(
          js2xmlparser.parse("Results",response.data)
        );
        
      })
      .catch((error) => {
        console.log(error)
      })

  });

      
});

// ##########################################################################################
app.get('/api/getLastOrderJSON',(req, res) => {
  
  let sql = "SELECT * FROM encomenda ORDER BY idencomenda DESC";
   let query = conn.query(sql,(err, results) => {
    if(err) throw err;
    
    var idencomenda = results[0].novaencomenda;

    const URL = 'https://my.jasminsoftware.com/api/225185/225185-0002/sales/orders/' + idencomenda;
    
    axios.get(URL, 
        { headers: { Authorization: AuthStr } })
      .then(response => {
    
        res.send(response.data);
      })
      .catch((error) => {
        console.log(error)
      })

  });

      
});

// ###############################################################################
// não usado
app.put('/api/putStockBalance',(req, res) => {
  
  var putLink = "https://my.jasminsoftware.com/api/225185/225185-0002/materialsCore/materialsItems/TELEMOVEL/materialsItemWarehouses/9707ad34-4f1b-ea11-b265-0003ff245385/stockBalance";
  var put = 1;


  const options = {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json;charset=UTF-8',
        'Authorization': `${AuthStr}`
      },
      body: put
    };

fetch(putLink, options)
  .then(response => {
    console.log(response.status);
    res.sendStatus(200);
  });
      
});

// ###############################################################################

app.post('/api/criaFatura',(req, res) => {
  
  var putLink = "https://my.jasminsoftware.com/api/225185/225185-0002/billing/processOrders/BillingOrder/a106d9be-4024-ea11-8454-0003ff2970e1";

  const options = {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json;charset=UTF-8',
        'Authorization': `${AuthStr}`
      }
	};

fetch(putLink, options)
  .then(response => {
    console.log(response.status);
    res.sendStatus(response.status);
  });
      
});

// ##########################################################################################

app.post('/api/insereFatura',(req, res) => {
	// Antes de criar fatura atualizar stockbalance 
    // fazer get da quantidade de compra da BD     
    // fazer get da encomenda
    // fazer get do produto que está na encomenda
    // somar a quantidade que está na base de dados 
    // fazer um post para atualizar o stockbalance para o novo
    // fazer post para criar fatura


    let sql = "SELECT * FROM quantidade ORDER BY idquantidade DESC";
    let query = conn.query(sql,(err, results) => {
     if(err) throw err;
     
     var stock = results[0].quantidade; 
     console.log("Stock BD: " + stock);
      getEncomenda(stock);
      
   });


   function getEncomenda(stock){
      let sql = "SELECT * FROM encomenda ORDER BY idencomenda DESC";
      let query = conn.query(sql,(err, results) => {
      if(err) throw err;
        var encomenda = results[0].novaencomenda;
        console.log("Stock BD: " + stock);
        console.log("Encomenda BD: " + encomenda);
        getProduto(stock,encomenda);
  
      });
   }


   function getProduto(stock,encomenda){
     var jasminLink = 'https://my.jasminsoftware.com/api/225185/225185-0002/sales/orders/' + encomenda;
     var produto;
     var stockBalance;
        
     axios.get(jasminLink, 
          { headers: { Authorization: AuthStr } })
        .then(response => {
            produto = response.data.documentLines[0].salesItem;
            
            console.log("Produto: " + produto);
            
            getStockProduto(stock,encomenda,produto);

            //updateStockBalance(stock,stockBalance,produto,encomenda);
        })
        .catch((error) => {
          console.log(error)
        })
   }


   function getStockProduto(stock,encomenda,produto){

    var jasminLink3 = "https://my.jasminsoftware.com/api/225185/225185-0002/materialsCore/materialsItems/" + produto;
    var stockBalance;
    axios.get(jasminLink3, 
      { headers: { Authorization: AuthStr } })
      .then(response => {

        stockBalance = response.data.materialsItemWarehouses[0].stockBalance;
        produtoID = response.data.materialsItemWarehouses[0].id;
        console.log("StockBalance: " + stockBalance);
        console.log("ProdutoID: " + produtoID);
        updateStockBalance(stock,stockBalance,produto,encomenda,produtoID);
      
      })
      .catch((error) => {
        console.log(error)
      })

   }


   function updateStockBalance(stock,stockBalance,produto,encomenda,produtoID){
      var jasminLinkUpdate = "https://my.jasminsoftware.com/api/225185/225185-0002/materialsCore/materialsItems/" + produto + "/materialsItemWarehouses/"+ produtoID +"/stockBalance";
      
      var newStock = 0;
      newStock = stockBalance + stock;
      
      console.log("New Stock: " + newStock);

      const options = {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json;charset=UTF-8',
          'Authorization': `${AuthStr}`
        },
        body: newStock
      };
  
  fetch(jasminLinkUpdate, options)
    .then(response => {
      
      insereFatura();
    });


   }

   function insereFatura(){
    // Insere fatura

    var buyerCustomerParty;
    var salesItem;
    var quantity;
    var amount;
    var symbol

    let sql = "SELECT * FROM fatura ORDER BY IDfatura DESC";
    let query = conn.query(sql,(err, results) => {
     if(err) throw err;
     
      var buyerCustomerParty =  results[0].buyerCustomerParty;
      var salesItem = results[0].salesItem;
      var quantity = results[0].quantity;
      var amount = results[0].amount;
      var symbol = results[0].symbol;

      insereFatura2(buyerCustomerParty,salesItem,quantity,amount,symbol);
     
      
   });
  }

   function insereFatura2(buyerCustomerParty,salesItem,quantity,amount,symbol){
      var dados = {
        buyerCustomerParty : `${buyerCustomerParty}`,
        documentLines: [
            {
                salesItem: `${salesItem}`,
                quantity: `${quantity}`,
                unitPrice: {
                    amount : `${amount}`,
                    symbol : `${symbol}`
                }
              }
        ]
      } // end dados

      // Axios request insere fatura
      var jasminLink4 = "https://my.jasminsoftware.com/api/225185/225185-0002/billing/invoices";

      axios.post(jasminLink4,dados,
        { headers: { Authorization: AuthStr}}
        )
        .then(response => {
			res.send(
				js2xmlparser.parse("Results",response.data)
			);
		
        })
        .catch((error) => {
            console.log(error);
        })
   }  // end insereFatura2

}); // end app.post(/api/insereFatura)


// ##################################################################################################################
app.post('/api/guiaRemessaFatura',(req, res) => {
  /*
    - receba o id de encomenda como parametro
    - receber o stock balance atual do produto e acrescentar o que temos na BD
    - crie uma guia de remessa dessa encomenda (apenas a primeira linha de artigo da encomenda)
    - crie fatura usando o id de remessa devolvido (apenas a primeira linha de artigo da remessa e da encomenda)
  */
  //var idEncomenda = req.params.id; // parametro recebido
  var idEncomenda = req.body.id;

  let sql = "SELECT * FROM quantidade ORDER BY idquantidade DESC";
  let query = conn.query(sql,(err, results) => {
   if(err) throw err;
   
   var stockBD = results[0].quantidade;
   console.log("StockBD:" +  stockBD); 

   getProduto(stockBD);
 });


  function getProduto(stockBD){
    var produtoID;
    var jasminLink = 'https://my.jasminsoftware.com/api/225185/225185-0002/sales/orders/' + idEncomenda;

    axios.get(jasminLink, 
         { headers: { Authorization: AuthStr } })
       .then(response => {
          produtoID = response.data.documentLines[0].salesItem;
          console.log("Produto Name: " + produtoID );
           
          getStockBalanceJasmin(produtoID,stockBD); 
       
          })
       .catch((error) => {
         console.log(error)
       })
 }


 function getStockBalanceJasmin(produtoID,stockBD){
  var URL = "https://my.jasminsoftware.com/api/225185/225185-0002/materialsCore/materialsItems/" + produtoID;
  var stockJasmin;

  axios.get(URL, 
    { headers: { Authorization: AuthStr } })
    .then(response => {

      id = response.data.materialsItemWarehouses[0].id;
      stockJasmin = response.data.materialsItemWarehouses[0].stockBalance;
      console.log("ProdutoID: " + id);
      console.log("Stock Jasmin: " + stockJasmin);
      postStockBalanceJasmin(produtoID,stockBD,stockJasmin,id);

    })
    .catch((error) => {
      console.log(error)
    })
 }



 function postStockBalanceJasmin(produtoID,stockBD,stockJasmin,id){
  var stockFinal = stockJasmin + stockBD;

  var jasminLinkUpdate = "https://my.jasminsoftware.com/api/225185/225185-0002/materialsCore/materialsItems/" + produtoID + "/materialsItemWarehouses/"+ id +"/stockBalance";
    
  const options = {
    method: 'PUT',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json;charset=UTF-8',
      'Authorization': `${AuthStr}`
    },
    body: stockFinal
  };

  fetch(jasminLinkUpdate, options)
  .then(response => {
      encomenda(stockBD);
  });

 }



 function encomenda(stockBD){
    // encomenda
  var url = "https://my.jasminsoftware.com/api/225185/225185-0002/sales/orders/" + idEncomenda;


  axios.get(url, 
    { headers: { Authorization: AuthStr } })
  .then(response => {
      
    var naturalKeyencomenda = response.data.naturalKey;
    console.log("Natural key encomenda: " + naturalKeyencomenda);
    guia(stockBD,naturalKeyencomenda);

  })
  .catch((error) => {
    console.log(error)
  })
 }


async function guia(stockBD,naturalKeyencomenda){
    // Guia
    var quantity = stockBD; // quatidade de produto na encomenda
    var sourceDocKey = naturalKeyencomenda;
    var sourceDocLineNumber = 1;
    var guiaID;

    var dados ={
      quantity: quantity,
      sourceDocKey: sourceDocKey,
      sourceDocLineNumber: 1
      }
      console.log(dados);

   var url = "https://my.jasminsoftware.com/api/225185/225185-0002/shipping/processOrders/DEFAULT";

  

   const options = {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json;charset=UTF-8',
      'Authorization': `${AuthStr}`
    },
    body: dados
  };

  fetch(url, options)
  .then(response => {
    console.log(response.data);
    guiaID = response.data;
    
    console.log("Guia ID: " + guiaID);
    getNaturalKeyguia(guiaID,quantity,naturalKeyencomenda);
  });



}


function getNaturalKeyguia(guiaID,quantity,naturalKeyencomenda){
  var url = "https://my.jasminsoftware.com/api/225185/225185-0002/shipping/deliveries/" + guiaID;

  axios.get(url, 
    { headers: { Authorization: AuthStr } })
    .then(response => {

     var naturalKeyguia = response.data.naturalKey;
     console.log(naturalKeyguia);
     fatura(naturalKeyguia,quantity,naturalKeyencomenda);

    })
    .catch((error) => {
      console.log(error)
    })

}


function fatura(naturalKeyguia,quantity,naturalKeyencomenda){
    // fatura 
    var deliveryKey = naturalKeyguia;
    var orderKey = naturalKeyencomenda;
    var url = "https://my.jasminsoftware.com/api/225185/225185-0002/billing/processOrders/DEFAULT";

    var dados = {
      deliveryKey: `${deliveryKey}`,
    	deliveryLineNumber: 1,
    	orderKey: `${orderKey}`,
    	quantity: `${quantity}`,
    	orderLineNumber: 1
    }

    axios.post(url,dados,
      { headers: { Authorization: AuthStr}}
      )
      .then(response => {
        var faturaID = response.data;
        console.log(faturaID);
        res.status(200).send(faturaID);
      })
      .catch((error) => {
          console.log(error)
      })
}
      
});


// ###########################################################################
//Server listening
app.listen(3000,() =>{
  console.log('Server started on port 3000...');
});