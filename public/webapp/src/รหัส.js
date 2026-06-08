const FOLDER_ID = "1Qy1bttIhOC0UsSEnPMN8w4yGF_jAa1H0";
const LINE_ACCESS_TOKEN = "5CqLnb0HnVIIhwfLWGav3O8c7bKuezymdZv6U+kBfsJfQTi7kpmEIlYKYlqMaZLq7FXJOlN9ArglV2JlZ0w4+hJVUUOiWqD3O1KsQpXg5VTHVOmDeS1UhrfhAqwMeBhcliA2BRZgOjCbOEefAcswKwdB04t89/1O/w1cDnyilFU="; // ใส่ Token ของคุณที่นี่

// Firebase Configuration
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDUcwd_8TYrJzYK6ole3FmGOy68HiYS0SY",
  authDomain: "fir-host-409cc.firebaseapp.com",
  databaseURL: "https://fir-host-409cc-default-rtdb.firebaseio.com",
  projectId: "fir-host-409cc",
  storageBucket: "fir-host-409cc.firebasestorage.app",
  messagingSenderId: "722995410827",
  appId: "1:722995410827:web:6c665c22b6d9694ff5a18e",
  measurementId: "G-F94TL1QJ9P"
};

function doGet(e) {
  const template = HtmlService.createTemplateFromFile('index');
  template.firebaseConfig = FIREBASE_CONFIG;
  return template.evaluate()
      .setTitle('Member & LINE Bot Management')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * ฟังก์ชันสำหรับขอสิทธิ์ (จำเป็นต้องรัน 1 ครั้งใน Editor)
 */
function triggerAuth() {
  UrlFetchApp.fetch("https://www.google.com");
  DriveApp.getRootFolder();
  return "สิทธิ์ได้รับการยืนยันแล้ว";
}

/**
 * สร้าง UUID สำหรับสมาชิกใหม่จากฝั่งเซิร์ฟเวอร์
 */
function getServerUuid() {
  return Utilities.getUuid();
}

/**
 * LINE Webhook Endpoint
 */
function doPost(e) {
  try {
    const contents = e && e.postData && e.postData.contents;
    if (!contents) {
      return createWebhookResponse({ ok: true, processed: 0 });
    }
    
    const data = JSON.parse(contents);
    const events = Array.isArray(data.events) ? data.events : [];

    events.forEach(event => {
      const replyToken = event.replyToken;
      const userId = event.source && event.source.userId;
      if (!replyToken) return;

      if (event.type === 'follow' && userId) {
        // 1. ดึงข้อมูลโปรไฟล์จาก LINE (UUID ของ LINE คือ userId)
        const profile = getLineProfile(userId);
        
        // 2. บันทึกข้อมูลคนติดตามลง Firebase (เก็บ UUID และข้อมูลโปรไฟล์)
        saveLineUser(userId, profile);
        
        // 3. ส่ง Flex Message ต้อนรับ
        sendWelcomeFlex(replyToken, profile.displayName, profile.pictureUrl);
        
      } else if (event.type === 'message' && event.message.type === 'text') {
        const userText = event.message.text.trim();
        handleKeywordSearch(replyToken, userText);
      }
    });

    return createWebhookResponse({ ok: true, processed: events.length });
  } catch (err) {
    console.log("Webhook Error: " + err.message);
    return createWebhookResponse({ ok: false, error: err.message });
  }
}

function createWebhookResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * ดึงข้อมูลโปรไฟล์ผู้ใช้จาก LINE
 */
function getLineProfile(userId) {
  try {
    const url = "https://api.line.me/v2/bot/profile/" + userId;
    const res = UrlFetchApp.fetch(url, {
      headers: { "Authorization": "Bearer " + LINE_ACCESS_TOKEN }
    });
    return JSON.parse(res.getContentText());
  } catch (e) {
    return { displayName: "คุณ", pictureUrl: "" };
  }
}

/**
 * บันทึกข้อมูลผู้ติดตามลง Firebase
 */
function saveLineUser(userId, profile) {
  const url = `${FIREBASE_CONFIG.databaseURL}/line_users/${userId}.json`;
  const data = {
    uuid: userId, // เก็บ userId เป็น UUID ใน Firebase
    name: profile.displayName,
    picture: profile.pictureUrl,
    timestamp: new Date().toISOString()
  };
  UrlFetchApp.fetch(url, {
    method: "put",
    contentType: "application/json",
    payload: JSON.stringify(data)
  });
}

/**
 * ค้นหา Keyword และตอบกลับด้วยรูปภาพ
 */
function handleKeywordSearch(replyToken, text) {
  const url = `${FIREBASE_CONFIG.databaseURL}/members.json`;
  const res = UrlFetchApp.fetch(url);
  const members = JSON.parse(res.getContentText());
  
  if (!members) return;

  const match = Object.values(members).find(m => m.keyword && m.keyword.toLowerCase() === text.toLowerCase());

  if (match && match.fileUrl) {
    sendLineMessage(replyToken, [{
      type: "image",
      originalContentUrl: match.fileUrl,
      previewImageUrl: match.fileUrl
    }]);
  }
}

/**
 * ส่ง Welcome Flex Message
 */
function sendWelcomeFlex(replyToken, name, picture) {
  const flexData = {
    "type": "bubble",
    "hero": {
      "type": "image",
      "url": picture || "https://lh3.googleusercontent.com/d/1Qy1bttIhOC0UsSEnPMN8w4yGF_jAa1H0",
      "size": "full",
      "aspectRatio": "20:13",
      "aspectMode": "cover"
    },
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        { "type": "text", "text": "ยินดีต้อนรับคุณ " + name + "!", "weight": "bold", "size": "xl", "color": "#1e293b" },
        {
          "type": "box",
          "layout": "vertical",
          "margin": "lg",
          "spacing": "sm",
          "contents": [
            { "type": "text", "text": "เราได้รับรหัส UUID ของคุณเข้าระบบแล้ว", "size": "sm", "color": "#64748b", "wrap": true },
            { "type": "text", "text": "พิมพ์ Keyword เพื่อรับรูปภาพได้ทันที", "size": "sm", "color": "#2563eb", "weight": "bold" }
          ]
        }
      ]
    },
    "footer": {
      "type": "box",
      "layout": "vertical",
      "spacing": "sm",
      "contents": [
        {
          "type": "button",
          "style": "primary",
          "height": "sm",
          "action": { "type": "uri", "label": "เปิดเว็บแอป", "uri": ScriptApp.getService().getUrl() }
        }
      ]
    }
  };

  sendLineMessage(replyToken, [{
    "type": "flex",
    "altText": "Welcome " + name,
    "contents": flexData
  }]);
}

/**
 * ฟังก์ชันพื้นฐานส่งข้อความกลับไปยัง LINE
 */
function sendLineMessage(replyToken, messages) {
  const url = "https://api.line.me/v2/bot/message/reply";
  UrlFetchApp.fetch(url, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + LINE_ACCESS_TOKEN
    },
    payload: JSON.stringify({
      replyToken: replyToken,
      messages: messages
    }),
    muteHttpExceptions: true
  });
}

/**
 * อัปโหลดรูปภาพไปยัง Drive และตั้งค่าเป็นสาธารณะ
 */
function uploadFile(fileData, fileName, fileType, oldFileId) {
  try {
    if (oldFileId) {
      try { DriveApp.getFileById(oldFileId).setTrashed(true); } catch (e) {}
    }
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const blob = Utilities.newBlob(Utilities.base64Decode(fileData.split(',')[1]), fileType, fileName);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return {
      fileId: file.getId(),
      fileUrl: `https://lh3.googleusercontent.com/d/${file.getId()}`,
      success: true
    };
  } catch (e) {
    throw new Error("Drive Upload Failed: " + e.message);
  }
}

function deleteDriveFile(fileId) {
  try {
    if (fileId) DriveApp.getFileById(fileId).setTrashed(true);
    return true;
  } catch (e) {
    return false;
  }
}
