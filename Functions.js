function toUpperStr(str) {
    return str.trim().split(' ').filter(Boolean) // removes empty strings and falsies
              .map(word => word[0].toUpperCase() + word.substr(1))
              .join(' ');
  }
  
  function convertTimeToReadableFormat(time) {
    // Questionable code to get time always in CST
    let cstHour = (time.getUTCHours() <= 6) ? 24 - (6 - time.getUTCHours()) : time.getUTCHours() - 6;
    const hours = (cstHour % 12) ? cstHour % 12 : 12;
    const minutes = time.toTimeString().split(":")[1];
    const period = Math.floor(cstHour / 12) ? "PM" : "AM";
    return `${hours}:${minutes} ${period}`; 
  }
  
  function convertDateToReadableFormat(date) {
    const date_tokens = date.toDateString().split(" ");
    const month = date_tokens[1];
    const day = date_tokens[2].replace(/^0+/g, ''); // trim leading zeros
    return `${month} ${day}${getDateSuffix(day)}`;
  }
  
  function getDateSuffix(day) {
    if (day % 10 == 1)
      return "st";
    else if (day % 10 == 2)
      return "nd";
    else if (day % 10 == 3)
      return "rd";
    else 
      return "th";
  }
  
  function saveSheetURLs() { 
    let pointsSheetURL = interfaceSheet.getRange(INTERFACE.POINTS_URL).getValue(); 
    let formSheetURL = interfaceSheet.getRange(INTERFACE.FORM_URL).getValue(); 
    scriptProperties.setProperty(SP.POINTS_URL, pointsSheetURL); 
    scriptProperties.setProperty(SP.FORM_URL, formSheetURL); }
  
  
  function resetScript() {
    interfaceSheet.getRange(INTERFACE.TESTS).clear();
    scriptProperties.deleteAllProperties(); 
    deleteTriggers();
  }
  
  function printErrorMessage(error) {
    let formSheet = new FormSheet().sheet;
    let newResponseRow = formSheet.getLastRow();
    let newResponse = formSheet.getRange(`A${newResponseRow}:O${newResponseRow}`).getValues()[0];
    let errorSheet = interfaceSheet.getSheetByName("Errors");
    let errorRow = errorSheet.getLastRow() + 1;
    
    let errorResponse = [[]];
    errorResponse[0].push(newResponse[RESPONSE.TIMESTAMP]);
    errorResponse[0].push(newResponse[RESPONSE.NAME]);
    errorResponse[0].push(toUpperStr(newResponse[RESPONSE.EVENT_NAME]));
    errorResponse[0].push(error);
  
    errorSheet.getRange(errorRow, 1, 1, 4).setValues(errorResponse);
  }
  
  function setTriggers() {
    let formSheet = new FormSheet().sheet;
    
    ScriptApp.newTrigger("onFormSubmit")
      .forSpreadsheet(formSheet)
      .onFormSubmit()
      .create();
  }
  
  function deleteTriggers() {
    let allTriggers = ScriptApp.getProjectTriggers();
    allTriggers.forEach(trigger => {
      ScriptApp.deleteTrigger(trigger);                    
    });
  }
  
  