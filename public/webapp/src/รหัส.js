const FOLDER_ID = "1Qy1bttIhOC0UsSEnPMN8w4yGF_jAa1H0";

/**
 * Get the active sheet named 'Members'. Create if not exists.
 */
function getSheet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error("No active spreadsheet found. This script must be bound to a Google Sheet.");
    
    let sheet = ss.getSheetByName('Members');
    if (!sheet) {
      sheet = ss.insertSheet('Members');
    }
    
    // Check and set headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['ID', 'Name', 'Email', 'FileID', 'FileURL', 'Timestamp']);
    }
    return sheet;
  } catch (e) {
    throw new Error("Sheet Access Error: " + e.message);
  }
}

function doGet() {
  return HtmlService.createTemplateFromFile('index')
      .evaluate()
      .setTitle('Member Registration CRUD')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Save or Update a record
 */
function saveRecord(data) {
  try {
    const sheet = getSheet();
    const id = data.id || Utilities.getUuid();
    let fileId = data.oldFileId || "";
    let fileUrl = data.oldFileUrl || "";

    // Handle File Upload if new data is provided
    if (data.fileData) {
      // Trash old file if it exists and a new one is uploaded
      if (data.oldFileId) {
        try { DriveApp.getFileById(data.oldFileId).setTrashed(true); } catch (e) { console.log("Old file not found or already deleted"); }
      }
      
      const folder = DriveApp.getFolderById(FOLDER_ID);
      const blob = Utilities.newBlob(Utilities.base64Decode(data.fileData.split(',')[1]), data.fileType, data.fileName);
      const file = folder.createFile(blob);
      fileId = file.getId();
      fileUrl = file.getUrl();
    }

    const values = [id, data.name, data.email, fileId, fileUrl, new Date()];
    const range = sheet.getDataRange();
    const rows = range.getDisplayValues();
    let found = false;
    
    // Update existing record
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] == id) {
        sheet.getRange(i + 1, 1, 1, values.length).setValues([values]);
        found = true;
        break;
      }
    }
    
    // Create new record
    if (!found) {
      sheet.appendRow(values);
    }
    
    SpreadsheetApp.flush();
    return { 
      success: true, 
      sheetUrl: SpreadsheetApp.getActiveSpreadsheet().getUrl() 
    };
  } catch (e) {
    throw new Error("Save Error: " + e.message);
  }
}

/**
 * Fetch all records for the UI table
 */
function getRecords() {
  try {
    const sheet = getSheet();
    const range = sheet.getDataRange();
    const data = range.getDisplayValues();
    
    if (data.length <= 1) return []; // Only headers or empty
    
    const headers = data[0]; // First row is headers
    const results = [];
    
    for (let i = 1; i < data.length; i++) {
      let obj = {};
      let row = data[i];
      if (!row[0]) continue; // Skip if ID is empty
      
      headers.forEach((header, index) => {
        let key = header.toString().toLowerCase().trim();
        obj[key] = row[index];
      });
      results.push(obj);
    }
    
    return results;
  } catch (e) {
    console.log("getRecords error: " + e.message);
    return [];
  }
}

/**
 * Delete a record and its associated file
 */
function deleteRecord(id) {
  try {
    const sheet = getSheet();
    const rows = sheet.getDataRange().getDisplayValues();
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] == id) {
        const fileId = rows[i][3]; // FileID column
        if (fileId) {
          try { DriveApp.getFileById(fileId).setTrashed(true); } catch (e) { console.log("File not found for deletion"); }
        }
        sheet.deleteRow(i + 1);
        break;
      }
    }
    SpreadsheetApp.flush();
    return { success: true };
  } catch (e) {
    throw new Error("Delete Error: " + e.message);
  }
}
