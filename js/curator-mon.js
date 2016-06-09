var etherScanApiUrl = 'https://api.etherscan.io/api'

var curatorAddress = '0xda4a4626d3e16e094de3225a751aab7128e96526';
var daoAddress = '0xbb9bc244d798123fde783fcc1c72d3bb8c189413';

var rebuildingState = false;

function startCuratorMonitor() {
  var ws = new ReconnectingWebSocket('wss://socket.etherscan.io/wshandler');

  ws.onopen = function()
  {
    console.log('opened');

    // Ping every 20 seconds
    function ping() {
      if (ws.readyState == 1) {
        ws.send(JSON.stringify({"event": "ping"}));
        setTimeout(ping, 20000);
      }
    }

    ping();

    // Watch the curator address
    ws.send(JSON.stringify({"event": "txlist", "address": curatorAddress}));

  };

  ws.onmessage = function (evt)
  {
    var received_msg = evt.data;
    console.log('message received');
    console.log(evt.data);

    var eventData = JSON.parse(evt.data);
    if ('event' in eventData) {
      var event = eventData['event'];

      var status = null;
      if ('status' in eventData) {
        status = eventData['status'];
      }

      var message = null;
      if ('message' in eventData) {
        message = eventData['message'];
      }

      if (event == 'subscribe-txlist' && status == '1') {
        if (message == 'OK, ' + curatorAddress) {
          console.log('We are subscribed!');

          // Rebuild the curator state from the beginning
          rebuildCuratorState();
        }
      }

      // Transaction example
      /*
      {"event":"txlist","address":"0xbb9bc244d798123fde783fcc1c72d3bb8c189413","result":[{"blockNumber":"1669986","timeStamp":"1465440927","hash":"0xa4c29478369334d2a785d9df7f264e4b0ce2edab839bbe49317bbcc37a480cff","nonce":"1","blockHash":"0x19a26806a492f9a0396fbd554a365d1204fde7a8dd9e0b5f60faf14cde264231","transactionIndex":"0","from":"0x9912c5d2793de8d2049f439a6cf21b68feb31218","to":"0xbb9bc244d798123fde783fcc1c72d3bb8c189413","value":"0","gas":"150000","gasPrice":"21000000000","input":"0xa9059cbb000000000000000000000000da7fa9a43655408823b678578fe5456c876efa9e00000000000000000000000000000000000000000000000066e9d905b65f6000","contractAddress":"","cumulativeGasUsed":"23889","gasUsed":"23889","confirmations":"3"}]}
      */

    }
  };

  ws.onclose = function()
  {
    console.log('closed');
  };
}

function updateQueryStringParameter(uri, key, value) {
  var re = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
  var separator = uri.indexOf('?') !== -1 ? "&" : "?";
  if (uri.match(re)) {
    return uri.replace(re, '$1' + key + "=" + value + '$2');
  }
  else {
    return uri + separator + key + "=" + value;
  }
}

function updateUriQueries(uri, values) {
  for (var key in values) {
    uri = updateQueryStringParameter(uri, key, values[key]);
  }
  return uri;
}

function rebuildCuratorState() {
  rebuildingState = true;

  var targetUrl = updateUriQueries(etherScanApiUrl, {
    module: 'logs',
    action: 'getLogs',
    fromBlock: '1416101',
    toBlock: 'latest',
    address: curatorAddress
  });
  console.log(targetUrl);

  $.ajax({
    url: targetUrl,
    dataType: 'json'
  }).done(function(data) {
    console.log(data);

    var status = null;
    if ('status' in data) {
      status = data['status'];
    }

    var message = null;
    if ('message' in data) {
      message = data['message'];
    }

    var result = null;
    if ('result' in data) {
      result = data['result'];
    }

    if (status == '1' && message == 'OK' && result) {
      console.log('We have the transactions to build the curator state.');
    }
  });

}

startCuratorMonitor();
