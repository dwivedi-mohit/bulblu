const { io } = require('socket.io-client');

const SERVER = 'http://localhost:3000';
const socket1 = io(SERVER, { transports: ['websocket'] });
const socket2 = io(SERVER, { transports: ['websocket'] });

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { passed++; console.log(`  ✓ ${label}`); }
  else { failed++; console.log(`  ✗ ${label}`); }
}

socket1.on('connect', () => {
  console.log('\n=== Video Chat Socket Test ===\n');
  console.log('Socket 1 connected:', socket1.id);
  
  // Identify both users
  socket1.emit('auth:identify', 'test-user-1');
  socket2.emit('auth:identify', 'test-user-2');
  
  setTimeout(() => testQueue(), 500);
});

socket2.on('connect', () => {
  console.log('Socket 2 connected:', socket2.id);
});

function testQueue() {
  let matched1 = null;
  let matched2 = null;
  let waitingFired = false;

  socket1.on('video:matched', (data) => {
    matched1 = data;
    assert(data.roomId && data.roomId.startsWith('video:pair:'), 'Socket 1 received roomId');
    assert(data.partnerId === 'test-user-2', 'Socket 1 got correct partnerId');
    assert(data.partnerName === 'Test User 2', 'Socket 1 got correct partnerName');
    assert(data.youAreInitiator === true, 'Socket 1 is initiator');
    checkDone();
  });

  socket2.on('video:matched', (data) => {
    matched2 = data;
    assert(data.roomId && data.roomId.startsWith('video:pair:'), 'Socket 2 received roomId');
    assert(data.partnerId === 'test-user-1', 'Socket 2 got correct partnerId');
    assert(data.partnerName === 'Test User 1', 'Socket 2 got correct partnerName');
    assert(data.youAreInitiator === false, 'Socket 2 is not initiator');
    checkDone();
  });

  socket2.on('video:waiting', () => {
    waitingFired = true;
    assert(true, 'Socket 2 got video:waiting (no one else in queue)');
  });

  // Socket 2 joins first — should get "waiting"
  socket2.emit('video:join-queue', {
    userId: 'test-user-2',
    name: 'Test User 2',
    avatar: '',
  });

  setTimeout(() => {
    // Socket 1 joins — should pair with Socket 2
    assert(waitingFired, 'Socket 2 received waiting before match');
    socket1.emit('video:join-queue', {
      userId: 'test-user-1',
      name: 'Test User 1',
      avatar: '',
    });
  }, 500);

  function checkDone() {
    if (matched1 && matched2) {
      assert(matched1.roomId === matched2.roomId, 'Both sockets got same roomId');
      
      // Test signal relay
      testSignalRelay(matched1.roomId);
    }
  }
}

function testSignalRelay(roomId) {
  const testSignal = { type: 'offer', sdp: 'fake-sdp-data' };
  let received = false;

  socket2.on('video:signal', (data) => {
    received = true;
    assert(data.roomId === roomId, 'Signal relayed with correct roomId');
    assert(data.signal.sdp === 'fake-sdp-data', 'Signal data relayed correctly');
    assert(data.senderId === 'test-user-1', 'Signal senderId correct');
    
    // Test text relay
    testTextRelay(roomId);
  });

  socket1.emit('video:signal', {
    roomId,
    signal: testSignal,
    senderId: 'test-user-1',
  });

  setTimeout(() => {
    if (!received) {
      assert(false, 'Signal was relayed to partner');
      cleanup();
    }
  }, 1000);
}

function testTextRelay(roomId) {
  let received = false;

  socket2.on('video:text-receive', (data) => {
    received = true;
    assert(data.content === 'Hello stranger!', 'Text message relayed correctly');
    assert(data.senderId === 'test-user-1', 'Text senderId correct');
    assert(data.senderName === 'Test User 1', 'Text senderName correct');
    
    // Test partner left
    testPartnerLeft(roomId);
  });

  socket1.emit('video:text-send', {
    roomId,
    senderId: 'test-user-1',
    senderName: 'Test User 1',
    content: 'Hello stranger!',
  });

  setTimeout(() => {
    if (!received) {
      assert(false, 'Text message was relayed');
      cleanup();
    }
  }, 1000);
}

function testPartnerLeft(roomId) {
  let received = false;

  socket2.on('video:partner-left', (data) => {
    received = true;
    assert(data.partnerId === 'test-user-1', 'Partner left event correct');
    
    console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
    cleanup();
    process.exit(failed > 0 ? 1 : 0);
  });

  socket1.emit('video:end', {
    roomId,
    senderId: 'test-user-1',
  });

  setTimeout(() => {
    if (!received) {
      assert(false, 'Partner left event received');
      cleanup();
      process.exit(1);
    }
  }, 1000);
}

function cleanup() {
  socket1.disconnect();
  socket2.disconnect();
}

// Timeout safety
setTimeout(() => {
  console.log(`\n=== TIMEOUT — Results: ${passed} passed, ${failed} failed ===\n`);
  cleanup();
  process.exit(1);
}, 10000);
