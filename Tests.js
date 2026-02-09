function runAllTests() {
    testMemberKeys();
  }
  
  function printTestResult(result, range, errorMessage) {
    const msg = result ? "Passed" : errorMessage;
    interfaceSheet.getRange(range).setValue(msg);
  }
  
  
  // Test if sheet URLs properly saved
  function testSheetURLsSaved() {
    let pointsSheetURL = scriptProperties.getProperty(SP.POINTS_URL);
    let formSheetURL = scriptProperties.getProperty(SP.FORM_URL);
    
    let testPassed = (pointsSheetURL && formSheetURL) ? true : false;
    printTestResult(testPassed, INTERFACE.TEST_SHEET_URLS_SAVED, ERROR.URLS_FAILED_TO_SAVE);
    return testPassed;
  }
  
  // Test if sheet URLs valid
  function testSheetURLsValid() {
    let pointsSheet = new PointsSheet();
    let formSheet = new FormSheet();
    
    let testPassed = (pointsSheet.sheet && formSheet.sheet); // this should always pass, if any errors occur it will stop the script and display in the interface
    console.log("test passed result", testPassed)
    if (!testPassed) {
      var pointsErrorMessage = (pointsSheet.sheet) ? "": ERROR.POINTS_URL_INVALID;
      var formErrorMessage = (formSheet.sheet) ? "" : ERROR.FORM_URL_INVALID; 
    }
    
    printTestResult(testPassed, INTERFACE.TEST_SHEET_URLS_VALID, `Failed! ${pointsErrorMessage} ${formErrorMessage}`);
    return testPassed;
  }
  
  // Test if all members correctly stored into script properties
  function testMemberKeys() {
    let membersDict = scriptProperties.getProperties();
    let divider = scriptProperties.getProperty(SP.DIVIDER);
    let num_members = scriptProperties.getProperty(SP.NUM_MEMBERS);
    console.log(membersDict);
    console.log(divider);
    console.log(num_members)
      
    let testPassed = (divider && num_members);
    printTestResult(testPassed, INTERFACE.TEST_MEMBER_KEYS_SAVED, ERROR.MEMBER_KEYS_FAILED_TO_SAVE);
    return testPassed;
  }
  
  // Run first example in the Testcase sheet and output it to the right
  function runTestCase() {
    let testCaseSheet = interfaceSheet.getSheetByName("Testcases");
    let newResponseRow = testCaseSheet.getLastRow();
    let newResponse = testCaseSheet.getRange(`A${newResponseRow}:O${newResponseRow}`).getValues()[0];
    let destSheet = testCaseSheet
    let destCol = destSheet.getLastColumn() + 1;
    
    // Create event header
    let eventHeader = [];
    eventHeader.push([toUpperStr(newResponse[RESPONSE.EVENT_NAME])]);
    eventHeader.push([toUpperStr(newResponse[RESPONSE.LOCATION])]);
    eventHeader.push([convertDateToReadableFormat(newResponse[RESPONSE.DATE])]);
    eventHeader.push([convertTimeToReadableFormat(newResponse[RESPONSE.TIME])]);
    eventHeader.push([`${newResponse[RESPONSE.ABSENCE_POINTS]}, ${newResponse[RESPONSE.ATTENDANCE_POINTS]}`]);
    eventHeader.push([newResponse[RESPONSE.DRESS_CODE]]);
    
    // Allocate points
    let membersDict = scriptProperties.getProperties();
    let absence_points = newResponse[RESPONSE.ABSENCE_POINTS];
    let attendance_points = newResponse[RESPONSE.ATTENDANCE_POINTS];
    let points = Array(parseInt(membersDict.members_length)).fill(absence_points ? [absence_points] : ['']);
      
    newResponse[RESPONSE.ATTENDEES].split(", ").forEach(member => {
      points[parseInt(membersDict[member])] = [attendance_points];
    });
    points[parseInt(membersDict[SP.DIVIDER])] = ['']; // empty divider line
    
    // Push new event to sheet
    destSheet.getRange(1, destCol, 6).setValues(eventHeader);
    destSheet.getRange(7, destCol, parseInt(membersDict.members_length)).setValues(points);
  }