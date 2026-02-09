const RESPONSE = {
    TIMESTAMP: 0,
    EMAIL: 1,
    NAME: 2,
    COMMITTEE_CHAIR: 3,
    EVENT_TYPE: 4,
    EVENT_NAME: 5,
    LOCATION: 6,
    DATE: 7,
    TIME: 8,
    DRESS_CODE: 9,
    ORGANIZERS: 10,
    ATTENDEES: 11,
    ATTENDANCE_POINTS: 12,
    ABSENCE_POINTS: 13,
  }
  
  const SP = {
    DIVIDER: "divider",
    NUM_MEMBERS: "members_length", // technically members + divider
    POINTS_URL: "points_url",
    FORM_URL: "form_url"
  }
  
  const INTERFACE = {
    POINTS_URL: "B2",
    FORM_URL: "B3",
    TESTS: "E2:E4",
    TEST_SHEET_URLS_SAVED: "E2",
    TEST_SHEET_URLS_VALID: "E3",
    TEST_MEMBER_KEYS_SAVED: "E4"
  }
  
  const POINTS_FIELD = {
    FIRST_NAME: 'A',
    LAST_NAME: 'B'
  }
  
  const ERROR = {
    URLS_FAILED_TO_SAVE: "Failed: Did you put in the sheet URLs?",
    POINTS_URL_INVALID: "Points sheet URL invalid!",
    FORM_URL_INVALID: "Form sheet URL invalid!",
    MEMBER_KEYS_FAILED_TO_SAVE: "Failed: Member keys failed to save to script properties."
  }
  
  // Globals
  var scriptProperties = PropertiesService.getScriptProperties();
  var interfaceURL = "https://docs.google.com/spreadsheets/d/15Gtr6_E-EYKXZIWpEE9pSv8obSpByGt_WYo4_5Zdhtw/edit";
  var interfaceSheet = SpreadsheetApp.openByUrl(interfaceURL);
  
  function PointsSheet() {
    // Temporary fix, usually taken from scriptProperties
    // this.sheetURL = interfaceSheet.getRange(INTERFACE.POINTS_URL).getValue();
  
    this.sheetURL = scriptProperties.getProperty(SP.POINTS_URL);
    // this.sheetURL = "https://docs.google.com/spreadsheets/d/1LKwRJlUxTleRHgC4e0h2xTALUnz3Yvh4xnvLvZkzQu4/edit";
  
    console.log(this.sheetURL)
  
    try { 
     this.sheet = SpreadsheetApp.openByUrl(this.sheetURL);
    } catch (error) {
      this.sheet = null;
    }
  }
  
  function FormSheet() {
    this.sheet = null;
    this.sheetId = null;
  
    const formUrl = scriptProperties.getProperty(SP.FORM_URL);
    if (!formUrl) {
      console.log("Missing script property: SP.FORM_URL");
      return;
    }
  
    console.log("raw formUrl:", formUrl);
  
    try {
      const editUrl = normalizeToEditFormUrl_(formUrl);
      const form = FormApp.openByUrl(editUrl);
  
      const destId = form.getDestinationId();
      console.log("destination spreadsheet id:", destId);
  
      if (!destId) return;
  
      this.sheetId = destId;
      this.sheet = SpreadsheetApp.openById(destId);
      console.log("opened spreadsheet:", this.sheet.getUrl());
  
    } catch (e) {
      console.log("FormSheet() failed:", e);
      this.sheet = null;
    }
  }
  
  function normalizeToEditFormUrl_(url) {
    // Editable form: /forms/d/<ID>/edit
    let m = url.match(/\/forms\/d\/([a-zA-Z0-9_-]+)/);
    if (m) {
      return `https://docs.google.com/forms/d/${m[1]}/edit`;
    }
  
    // Published form: /forms/d/e/<PUBLISHED_ID>/viewform
    m = url.match(/\/forms\/d\/e\/([a-zA-Z0-9_-]+)/);
    if (m) {
      throw new Error(
        "Published (/d/e/) form URLs cannot be opened by FormApp. " +
        "Paste the EDIT form URL (…/forms/d/<ID>/edit) into the interface sheet."
      );
    }
  
    throw new Error("Unrecognized Google Form URL: " + url);
  }
  
  
  