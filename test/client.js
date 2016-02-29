var Client = require('../')
var common = require('./common')
var fs = require('fs')
var parseTorrent = require('parse-torrent')
var path = require('path')
var test = require('tape')

var torrent = fs.readFileSync(path.join(__dirname, 'torrents/bitlove-intro.torrent'))
var parsedTorrent = parseTorrent(torrent)
var peerId1 = new Buffer('01234567890123456789')
var peerId2 = new Buffer('12345678901234567890')
var peerId3 = new Buffer('23456789012345678901')
var port = 6881

function mockWebSocketTracker (client) {
  client._trackers[0]._generateOffers = function (numwant, cb) {
    var offers = []
    for (var i = 0; i < numwant; i++) {
      offers.push('fake_offer_' + i)
    }
    process.nextTick(function () {
      cb(offers)
    })
  }
}

function testClientStart (t, serverType) {
  t.plan(4)
  common.createServer(t, serverType, function (server, announceUrl) {
    parsedTorrent.announce = [ announceUrl ]
    var client = new Client(peerId1, port, parsedTorrent, { wrtc: {} })

    if (serverType === 'ws') mockWebSocketTracker(client)
    client.on('error', function (err) { t.error(err) })
    client.on('warning', function (err) { t.error(err) })

    client.once('update', function (data) {
      t.equal(data.announce, announceUrl)
      t.equal(typeof data.complete, 'number')
      t.equal(typeof data.incomplete, 'number')

      client.stop()

      client.once('update', function () {
        t.pass('got response to stop')
        server.close()
        client.destroy()
      })
    })

    client.start()
  })
}

test('http: client.start()', function (t) {
  testClientStart(t, 'http')
})

test('udp: client.start()', function (t) {
  testClientStart(t, 'udp')
})

test('ws: client.start()', function (t) {
  testClientStart(t, 'ws')
})

function testClientStop (t, serverType) {
  t.plan(3)
  common.createServer(t, serverType, function (server, announceUrl) {
    parsedTorrent.announce = [ announceUrl ]
    var client = new Client(peerId1, port, parsedTorrent, { wrtc: {} })

    if (serverType === 'ws') mockWebSocketTracker(client)
    client.on('error', function (err) { t.error(err) })
    client.on('warning', function (err) { t.error(err) })

    client.start()

    setTimeout(function () {
      client.stop()

      client.once('update', function (data) {
        // receive one final update after calling stop
        t.equal(data.announce, announceUrl)
        t.equal(typeof data.complete, 'number')
        t.equal(typeof data.incomplete, 'number')

        server.close()
        client.destroy()
      })
    }, 1000)
  })
}

test('http: client.stop()', function (t) {
  testClientStop(t, 'http')
})

test('udp: client.stop()', function (t) {
  testClientStop(t, 'udp')
})

test('ws: client.stop()', function (t) {
  testClientStop(t, 'ws')
})

function testClientUpdate (t, serverType) {
  t.plan(4)
  common.createServer(t, serverType, function (server, announceUrl) {
    parsedTorrent.announce = [ announceUrl ]
    var client = new Client(peerId1, port, parsedTorrent, { wrtc: {} })

    if (serverType === 'ws') mockWebSocketTracker(client)
    client.on('error', function (err) { t.error(err) })
    client.on('warning', function (err) { t.error(err) })

    client.setInterval(2000)

    client.start()

    client.once('update', function () {
      client.setInterval(2000)

      // after interval (2s), we should get another update
      client.once('update', function (data) {
        // received an update!
        t.equal(data.announce, announceUrl)
        t.equal(typeof data.complete, 'number')
        t.equal(typeof data.incomplete, 'number')
        client.stop()

        client.once('update', function () {
          t.pass('got response to stop')
          server.close()
          client.destroy()
        })
      })
    })
  })
}

test('http: client.update()', function (t) {
  testClientUpdate(t, 'http')
})

test('udp: client.update()', function (t) {
  testClientUpdate(t, 'udp')
})

test('ws: client.update()', function (t) {
  testClientUpdate(t, 'ws')
})

function testClientScrape (t, serverType) {
  t.plan(4)
  common.createServer(t, serverType, function (server, announceUrl) {
    parsedTorrent.announce = [ announceUrl ]
    var client = new Client(peerId1, port, parsedTorrent, { wrtc: {} })

    if (serverType === 'ws') mockWebSocketTracker(client)
    client.on('error', function (err) { t.error(err) })
    client.on('warning', function (err) { t.error(err) })

    client.once('scrape', function (data) {
      t.equal(data.announce, announceUrl)
      t.equal(typeof data.complete, 'number')
      t.equal(typeof data.incomplete, 'number')
      t.equal(typeof data.downloaded, 'number')

      server.close()
      client.destroy()
    })

    client.scrape()
  })
}

test('http: client.scrape()', function (t) {
  testClientScrape(t, 'http')
})

test('udp: client.scrape()', function (t) {
  testClientScrape(t, 'udp')
})

// TODO: uncomment once scrape is supported on WebSocket trackers
// test('ws: client.scrape()', function (t) {
//   testClientScrape(t, 'ws')
// })

function testClientAnnounceWithNumWant (t, serverType) {
  t.plan(4)
  common.createServer(t, serverType, function (server, announceUrl) {
    parsedTorrent.announce = [ announceUrl ]
    var client1 = new Client(peerId1, port, parsedTorrent, { wrtc: {} })

    if (serverType === 'ws') mockWebSocketTracker(client1)
    client1.on('error', function (err) { t.error(err) })
    client1.on('warning', function (err) { t.error(err) })

    client1.start()
    client1.once('update', function () {
      var client2 = new Client(peerId2, port + 1, parsedTorrent, { wrtc: {} })

      if (serverType === 'ws') mockWebSocketTracker(client2)
      client2.on('error', function (err) { t.error(err) })
      client2.on('warning', function (err) { t.error(err) })

      client2.start()
      client2.once('update', function () {
        var client3 = new Client(peerId3, port + 2, parsedTorrent, { wrtc: {} })

        if (serverType === 'ws') mockWebSocketTracker(client3)
        client3.on('error', function (err) { t.error(err) })
        client3.on('warning', function (err) { t.error(err) })

        client3.start({ numwant: 1 })
        client3.on('peer', function () {
          t.pass('got one peer (this should only fire once)')

          var num = 3
          function tryCloseServer () {
            num -= 1
            if (num === 0) server.close()
          }

          client1.stop()
          client1.once('update', function () {
            t.pass('got response to stop (client1)')
            client1.destroy()
            tryCloseServer()
          })
          client2.stop()
          client2.once('update', function () {
            t.pass('got response to stop (client2)')
            client2.destroy()
            tryCloseServer()
          })
          client3.stop()
          client3.once('update', function () {
            t.pass('got response to stop (client3)')
            client3.destroy()
            tryCloseServer()
          })
        })
      })
    })
  })
}

test('http: client announce with numwant', function (t) {
  testClientAnnounceWithNumWant(t, 'http')
})

test('udp: client announce with numwant', function (t) {
  testClientAnnounceWithNumWant(t, 'udp')
})

test('ws: client announce with numwant', function (t) {
  testClientAnnounceWithNumWant(t, 'ws')
})
