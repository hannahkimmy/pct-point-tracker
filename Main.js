function onFormSubmit() {
    try {
      publishNewEvent();
    } catch (error) {
      printErrorMessage(error);
    }
  }
  
  function publishNewEvent() {
    let formSheet = new FormSheet().sheet;
    let pointsSheet = new PointsSheet().sheet;
    let newResponseRow = formSheet.getLastRow();
    let newResponse = formSheet.getRange(`A${newResponseRow}:O${newResponseRow}`).getValues()[0];
    let destSheet = pointsSheet.getSheetByName(newResponse[RESPONSE.EVENT_TYPE]);
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
    // let spSheet = interfaceSheet.getSheetByName("ScriptProperties");
    // let sp = spSheet.getRange(`A2:B${spSheet.getLastRow()}`).getValues();
    // let membersDict = {};
    // sp.forEach((member, index) => {
    //   let key = member[0];
    //   let value = member[1];
    //   membersDict[key] = value;
    // })
  
    let absence_points = newResponse[RESPONSE.ABSENCE_POINTS];
    let attendance_points = newResponse[RESPONSE.ATTENDANCE_POINTS];
    let points = Array(parseInt(membersDict.members_length)).fill(absence_points ? [absence_points] : ['']);
    let goo = newResponse[RESPONSE.ATTENDEES]
      
    newResponse[RESPONSE.ATTENDEES].split(", ").forEach(member => {
      points[parseInt(membersDict[member])] = [attendance_points];
    });
    points[parseInt(membersDict[SP.DIVIDER])] = ['']; // empty divider line
    
    // Push new event to sheet
    destSheet.getRange(1, destCol, 6).setValues(eventHeader);
    destSheet.getRange(7, destCol, parseInt(membersDict.members_length)).setValues(points);
  }
  
  // Initialize sanitation processes to clean up sheets and instantiate properties
  function init() {
    resetScript();
    if (!saveAndTestSheets()) // break if sheets invalid
      return;
    
    let pointsSheet = new PointsSheet().sheet;
    let summarySheet = pointsSheet.getSheets()[0];
    let membersRef = summarySheet.getRange(`${POINTS_FIELD.FIRST_NAME}3:${POINTS_FIELD.LAST_NAME}${summarySheet.getLastRow()}`);
  
    cleanMemberNames(membersRef);
    saveMemberKeys(membersRef);
    setTriggers();
  
    runAllTests();
  }
  
  function cleanMemberNames(membersRef) {
    let members = membersRef.getValues();
  
    // Clean members names of trailing whitespaces
    members.forEach(member => {
      member[0] = member[0].trim();
      member[1] = member[1].trim();
    })
    membersRef.setValues(members);
  }
  
  function saveMemberKeys(membersRef) {
    let members = membersRef.getValues();
  
    // Store members in scriptProperties || DEPRECATED: Performance inconsistent, TODO: FIX LATER
    let membersDict = {};
    members.forEach((member, index) => {
      if (member[0] == "")
        membersDict[SP.DIVIDER] = index;
      else
        membersDict[`${member[0]} ${member[1]}`] = index;
    })
  
    // Converting to list format
    output = []
    members.forEach((member, index) => {
      if (member[0] == "")
        output.push([SP.DIVIDER, index]);
      else
        output.push([`${member[0]} ${member[1]}`, index])
    })
  
    // // Storing scriptProperties in Interface 'ScriptProperties' sheet
    // let spSheet = interfaceSheet.getSheetByName("ScriptProperties");
    // spSheet.getRange(`A2:B${1+output.length}`).setValues(output);
    // spSheet.getRange(`A${2+output.length}:B${2+output.length}`).setValues([[SP.NUM_MEMBERS, members.length]]);
  
    scriptProperties.setProperties(membersDict);
    scriptProperties.setProperty(SP.NUM_MEMBERS, members.length);
  }
  
  function saveAndTestSheets() {
    saveSheetURLs();
    
    if (testSheetURLsSaved())
      return testSheetURLsValid();
    else
      return false; 
  }