/*==================================================================================================
  PSPadJSLint   jshint wrapper for pspad, based on jshint.js

  Copyright (c) 2008-2011 by PSPadJSHint

  Code:         http://github.com/PSPadJSHint/pspadjshint

  Usage:
  Put this file in the JScripts directory and recompile scripts.
  Create a directory 'library' in the  JScripts directory.
  Put a jshint file in the 'library' directory with the name jshint.js. 
  Select Scripts | JSHint | Usage for more explanation. (See function usage)


  ChangeList:
  20111010      Cretaed, version 1.1.1
==================================================================================================*/

/*global
addMenuItem echo inputText sleep pspadVersion getVarValue moduleExists moduleVersion moduleFileName 
modulePath closeEditorByTitle closeEditorByIndex closeAllEditors newEditor editorsCount 
setClipboardText getClipboardText runPSPadAction activate appendText assignActiveEditor 
assignEditorByIndex assignEditorByName assignLog caretX caretY closeFile command fileName lineText 
linesCount newFile openFile openFileFromFTP printFile readOnly reloadFile saveFile saveFileAs 
saveFileToFTP selText setBlockBegin setBlockEnd blockBeginX blockBeginY blockEndX blockEndY selStart 
selLength selectionMode setCaretPos text logClear logAddLine logGetLine logSetLine logLinesCount 
projectSave projectFilesCount projectFiles projectFileName ftpConnect ftpDisconnect ftpCommand 
ftpDownloadFile ftpUploadFile
   
ScriptEngine ScriptEngineMajorVersion ActiveXObject Application

JSHINT 
*/

/*jshint strict: false wsh:true

*/


var menuName = "JSHint",
    module_name = "PSPadJSHint",
    module_ver = "1.1.1",
    myself = this;


function openScript()
{
  var editor = newEditor();
  editor.openFile(moduleFileName(module_name));
}


function menuTest()
{
  /*jshint newcap:false*/
  logClear();
  logAddLine(ScriptEngine());
  logAddLine(ScriptEngineMajorVersion());
}


function include(name)
{
  "use strict";
/*jshint evil: true */
  var object, forReading, file, text, includes = myself.includes || [], loaded = false, i, l;
  
  try
  {
    for (i = 0, l = includes.length; i < l && !loaded; i += 1)
    {
      if (includes[i] === name)
      {
        loaded = true;
      }
    }
    if (!loaded)
    {
      object = new ActiveXObject("Scripting.FileSystemObject");
      forReading = 1;
      file = object.openTextFile(name, forReading);
      text = file.readAll();
      file.Close();
      eval(text);
      includes.push(name);
      myself.includes = includes;
      myself.JSHINT = JSHINT;
    }
  }
  catch (e)
  {
    logAddLine(e.message);
  }   
}

function includeJSHINTJS()
{
  var path = modulePath(module_name),
      name = 'library\\jshint.js',
      filename = path + name;
      
  try
  {
    include(filename);
    this.JSHINT = JSHINT;
  }
  catch (e)
  {
    logAddLine(e.message);
  }  
}



function menuInclude()
{
  /*jshint white:false*/
  includeJSHINTJS();
  if (JSHINT) logAddLine("JSHINT exists");
  else logAddLine("JSHINT not found");
}



/*==================================================================================================
  JSHint wrapper for PSPad

  Now following the code to integrate JSHINT into PsPad.
  If there are errors found, they are displayed in the log with file, line and column.
  If no errors are found, unused functions and properties are displayed.
==================================================================================================*/
/*jshint indent: 2*/

/*global logAddLine newEditor assignActiveEditor setClipboardText logClear addMenuItem
logSetParser echo logLineIndex logLinesCount runPSPadAction editorsCount getClipboardText
*/


var JSHINTPSPAD = (function () 
{
  "use strict";
  
  
  var logInfoList, itself;

  function TLogInfo(afile, aline, acol) {
    this.file = afile;
    this.line = aline + 1;
    this.col = acol + 1;
    this.logline = logLinesCount() - 1;
  }


  logInfoList = {
    items: [],
    index: 0,
    currentItem: function () {
      return this.items[this.index];
    },
    add: function (item) {
      this.items.push(item);
    },
    clear: function () {
      this.items = [];
      this.index = 0;
    },
    next: function () {
      if (this.index < this.items.length - 1) {
        this.index += 1;
      }
    },
    prev: function () {
      if (this.index > 0) {
        this.index -= 1;
      }
    }
  };


  function $defined(obj) {
    return (obj !== undefined);
  }

  itself = function () {
    var activeEditor,
      source,
      fileName,
      result,
      data,
      boolOptions,
      key;

    function extractFileName(fileName) {
      var results = fileName.split('\\');
      return results[results.length - 1];
    }

    function printErrors(data) {
      var i, l, item, evidence, reason, line, character;

      logAddLine("");
      logAddLine(data.length + ' error(s)');

      for (i = 0, l = data.length; i < l; i += 1) {
        item = data[i];
        if (item) {
          evidence = (item.evidence || '').replace(/^\s*(\S*(\s+\S+)*)\s*$/, "$1");
          reason = (item.reason || '.');
          reason = reason.substring(0, reason.length - 1) + ': ';
          line = item.line;
          character = item.character;

          logAddLine('[Lint] ' + extractFileName(fileName) + '(' + line + ', ' + character + ') : ' + reason + ' ' + evidence);
          logInfoList.add(new TLogInfo(fileName, line - 1, character - 1));
        }
      }
    }

    function printUnused(data) {
      var i, l, item, line, character;

      logAddLine("");
      logAddLine(data.length + ' unused(s)');

      for (i = 0, l = data.length; i < l; i += 1) {
        item = data[i];
        if (item) {
          line = item.line;
          character = 1;

          logAddLine('[Lint] ' + extractFileName(fileName) + '(' + line + ', ' + character + ') : ' + 'unused variable' + ' ' + item.name + ' in function ' + item['function']);
          logInfoList.add(new TLogInfo(fileName, line - 1, character - 1));
        }
      }
    }

    function printImplieds(data) {
      var i, l, j, k, item, line, character;

      logAddLine("");
      logAddLine(data.length + ' implied(s)');

      for (i = 0, l = data.length; i < l; i += 1) {
        item = data[i];
        if (item) {
          for (j = 0, k = item.line.length; j < k; j += 1) {
            line = item.line;
            character = 1;

            line = item.line[j];
            logAddLine('[Lint] ' + extractFileName(fileName) + '(' + line + ', ' + character + ') : ' + 'implied global' + ' ' + item.name);
            logInfoList.add(new TLogInfo(fileName, line - 1, character - 1));
          }
        }
      }
    }

    function printMembers(data) {
      var i, list, name, member, info, len;

      len = 0;
      info = '';
      list = [];
      for (member in data) {
        if (Object.prototype.hasOwnProperty.call(data, member)) {
          list.push(member);
        }
      }

      logAddLine('');
      logAddLine(list.length + ' members');

      if (list.length) {
        list.sort();
        info += '/*members ';
        for (i = 0; i < list.length; i += 1) {
          name = list[i].name();
          if (len + name.length > 80) {
            //clipBoard.push(info);
            logAddLine(info);
            info = '';
            len = 0;
          }
          if (i < list.length - 1) {
            name += ', ';
          }
          len += name.length;
          info += name;
        }
        info += '*/';
        logAddLine(info);
        //clipBoard.push(info);
        //setClipboardText(clipBoard.join('\n'));
      }
    }

    function printGlobals(data) {
      var i, l, list, name, info, len;

      logAddLine('');
      logAddLine(data.length + ' globals');

      len = 0;
      info = '';
      list = [];
      for (i = 0, l = data.length; i < l; i += 1) {
        /*jshint forin:true*/
        if (typeof data[i] === 'string') {
          list.push(data[i]);
        }
      }
      if (list.length) {
        list.sort();
        info += '/*globals ';
        for (i = 0, l = list.length; i < l; i += 1) {
          name = list[i].name();
          if (len + name.length > 80) {
            //clipBoard.push(info);
            logAddLine(info);
            info = '';
            len = 0;
          }
          if (i < list.length - 1) {
            name += ', ';
          }
          len += name.length;
          info += name;
        }
        info += '*/';
        logAddLine(info);
        //clipBoard.push(info);
        //setClipboardText(clipBoard.join('\n'));
      }
    }
    includeJSHINTJS();


    activeEditor = newEditor();
    activeEditor.assignActiveEditor();
    source = activeEditor.text();
    fileName = activeEditor.fileName();

    logAddLine("");
    logAddLine('parsing ' + fileName);

    logInfoList.clear();

    boolOptions = {};
    for (key in JSHINTPSPAD.useroptions)
    {
      if (Object.prototype.hasOwnProperty.call(JSHINTPSPAD.useroptions, key))
      {
        boolOptions[key] = JSHINTPSPAD.useroptions[key];
      }
    }
    result = JSHINT(source, boolOptions);
    data = JSHINT.data();

    if ($defined(data.errors)) {
      printErrors(data.errors);
      result = false;
    }
    if ($defined(data.unused)) {
      printUnused(data.unused);
      result = false;

    }
    if ($defined(data.implieds)) {
      printImplieds(data.implieds);
      result = false;
    }
    if (result) {
      logAddLine('');
      logAddLine('no errors found');
      if ($defined(data.globals)) {
        printGlobals(data.globals);
      }
      if ($defined(data.member)) {
        printMembers(data.member);
      }
    }

    logSetParser('[Lint] %F(%L, %C) : ');
    return result;
  };

  itself.currentLogInfo = function () {
    var ed, loginfo;
    loginfo = logInfoList.currentItem();
    if (loginfo) {
      ed = newEditor();
      ed.assignEditorByName(loginfo.file);
      ed.activate();
      ed.setCaretPos(loginfo.col, loginfo.line);
      logLineIndex(loginfo.logline);
    }
  };

  itself.nextLogInfo = function () {
    if (logInfoList.items.length === 0) {
      logClear();
      itself();
    }
    logInfoList.next();
    this.currentLogInfo();
  };

  itself.previousLogInfo = function () {
    if (logInfoList.items.length === 0) {
      logClear();
      itself();
    }
    logInfoList.prev();
    this.currentLogInfo();
  };

  return itself;
}());


/*==================================================================================================
  PSPad menu functions
==================================================================================================*/
function jSHintCurrentFile() {
  "use strict";
  logClear();
  try
  {
    JSHINTPSPAD();
    JSHINTPSPAD.currentLogInfo();
  }
  catch (e)
  {
    logAddLine('jSHintCurrentFile: ' + e.message);
  }
}

function jSHintPrev() {
  "use strict";
  JSHINTPSPAD.previousLogInfo();
}

function jSHintNext() {
  "use strict";
  JSHINTPSPAD.nextLogInfo();
}

function jSHintFile(editor, close) {
  "use strict";
  var result = true, fileName, pos;
  try 
  {
    fileName = editor.fileName();
    pos = fileName.search(/\.js/i);
    if (pos !== -1 && pos === fileName.length - 3) {
      logAddLine(editor.fileName());
      editor.activate();
      result = JSHINTPSPAD();
      if (result && close) {
        editor.closeFile();
      }
    } else if (close) {
      editor.closeFile();
    }
  } catch (e) {
    logAddLine(e.message);
  }
  return result;
}

function jSHintAbout() {
  "use strict";
  
  var info, edition;

  includeJSHINTJS();
  edition = JSHINT.edition; 
  info = '';
  info += 'About JSHintPSPad\n';
  info += '\n';
  info += 'Version ' + module_ver + '.\n';
  info += 'Using jshint from ' + edition + ' (www.jshint.com).\n';
  info += '\n';
  info += 'Perform jshint on javascript files and browse results.\n';

  echo(info);
}

function jSHintUsage() {
  "use strict";
  var info = '';

  info += '---- Usage --------------------------------------------------------------------------------------------------------------------\n';
  info += '\n';
  info += 'Open a JavaScript file and run JSHint.\n';
  info += 'A list with \'[Lint]\' messages is put in the Log.\n';
  info += 'You can select previous and next [Lint] message with Shift-Alt-Up and ~Down.\n';
  info += 'You can click on the [Lint] message line and the cursor jumps to the line.\n';
  info += '\n';
  info += 'Alternatively you can run jshint on all open files. All files are saved first.\n';
  info += 'Non javascript files are closed. Jshint is performed on javascript files.\n';
  info += 'On success, the file is closed and the next file is processed.\n';
  info += 'On error, the process stops.\n';
  info += '\n';
  info += '\n';
  info += '---- Functions ----------------------------------------------------------------------------------------------------------------\n';
  info += '\n';
  info += '- JSHint All Open Files            perform JSHint on all open files and close after success.\n';
  info += '- JSHint All Open Files and Close  (shift+ctrl+alt+F9) perform JSHint on all open files.\n';
  info += '- JSHint (ctrl+alt+F9)            perform JSHint on current file in editor.\n';
  info += '- Prev JSHint (ctrl+alt+up)       goto the previous JSHint error.\n';
  info += '- Next JSHint (ctrl+alt+down)     goto the next JSHint error.\n';
  info += '- JSHint Usage                     explains how to use these functions.\n';
  info += '- JSHint About                     displays the JSHint version number.\n';
  info += '- Edit JSHint Script File          opens this file in PSPAd.\n';
  info += '\n';
  info += '\n';
  echo(info);
}

function openScript() {
  "use strict";
  var editor = newEditor();
  editor.openFile(moduleFileName(module_name));
}

function dojSHintAllOpenFiles(close) {
  "use strict";
  var i, editor, error, count, assigned;

  runPSPadAction('aSaveAll');

  editor = newEditor();
  error = false;
  count = editorsCount();

  for (i = 0; i < count && !error; i += 1)
  {
    assigned = editor.assignEditorByIndex(i);
    if (assigned)
    {
      logClear();
      error = !jSHintFile(editor, close);
    }
  }
}
function jSHintAllOpenFiles() {
  "use strict";
  dojSHintAllOpenFiles(false);
}
function jSHintAllOpenFilesClose() {
  "use strict";
  dojSHintAllOpenFiles(true);
}

(function () {
  "use strict";
  /*jshint white:false*/

  JSHINTPSPAD.useroptions = {
    asi         : false, // if automatic semicolon insertion should be tolerated
    bitwise     : true, // if bitwise operators should not be allowed
    boss        : false, // if advanced usage of assignments should be allowed
    browser     : true, // if the standard browser globals should be predefined
    couch       : false, // if CouchDB globals should be predefined
    curly       : false, // if curly braces around blocks should be required (even in if/for/while)
    debug       : false, // if debugger statements should be allowed
    devel       : false, // if logging globals should be predefined (console, alert, etc.)
    eqeqeq      : true, // if === should be required
    eqnull      : false, // if == null comparisons should be tolerated
    es5         : true, // if ES5 syntax should be allowed
    evil        : false, // if eval should be allowed
    expr        : false, // if ExpressionStatement should be allowed as Programs
    forin       : true, // if for in statements must filter
    globalstrict: false, // if global "use strict"; should be allowed (also enables 'strict')
    immed       : true, // if immediate invocations must be wrapped in parens
    jquery      : false, // if jQuery globals should be predefined
    latedef     : true, // if the use before definition should not be tolerated
    laxbreak    : false, // if line breaks should not be checked
    loopfunc    : false, // if functions should be allowed to be defined within loops
    mootools    : true, // if MooTools globals should be predefined
    newcap      : true, // if constructor names must be capitalized
    noarg       : true, // if arguments.caller and arguments.callee should be disallowed
    node        : true, // if the Node.js environment globals should be predefined
    noempty     : true, // if empty blocks should be disallowed
    nomen       : true, // if names should be checked
    nonew       : true, // if using `new` for side-effects should be disallowed
    onevar      : true, // if only one var statement per function should be allowed
    passfail    : false, // if the scan should stop on first error
    plusplus    : false, // if increment/decrement should not be allowed
    prototypejs : false, // if Prototype and Scriptaculous globals should be predefined
    regexdash   : true, // if unescaped last dash (-) inside brackets should be tolerated
    regexp      : false, // if the . should not be allowed in regexp literals
    rhino       : false, // if the Rhino environment globals should be predefined
    scripturl   : true, // if script-targeted URLs should be tolerated
    shadow      : false, // if variable shadowing should be tolerated
    strict      : true, // require the "use strict"; pragma
    sub         : false, // if all forms of subscript notation are tolerated
    supernew    : true, // if `new function () { ... };` and `new Object;` should be tolerated
    trailing    : false,// if trailing whitespace rules apply
    undef       : true, // if variables should be declared before used
    white       : true, // if strict whitespace rules apply
    wsh         : false, // if the Windows Scripting Host environment globals should be predefined

    'maxerr'    : 50,     //This option is used to specify maximum number of errors before JSHint stops processing your source. Default value is 50.
    'indent'    : 2     // The number of spaces used for indentation (default is 4)
    //'predef'    : ['Array', 'Function', 'MooTools', 'etc'];
    //'predef'    : {'Array': true, 'Function': false, 'Mootools': true, 'etc': false};
  };
}());



/*==================================================================================================
  Description   Init function needed by pspad. It put the functions on the Scripts menu together
                with shortcuts.
==================================================================================================*/
function Init() 
{
  "use strict";
  var idTag, cbText; 
  
  idTag = "<" + menuName + ">";
  cbText = getClipboardText();
  if (cbText.indexOf(idTag) === -1)
  {
    addMenuItem("JSHint", menuName, "jSHintCurrentFile", "Ctrl+Alt+F9");
    addMenuItem("Prev JSHint", menuName, "jSHintPrev", "Ctrl+Alt+Up");
    addMenuItem("Next JSHint", menuName, "jSHintNext", "Ctrl+Alt+Down");
    addMenuItem("-", menuName, "");
    addMenuItem("JSHint All Open Files", menuName, "jSHintAllOpenFiles");
    addMenuItem("JSHint All Open Files and Close", menuName, "jSHintAllOpenFilesClose", "Shift+Ctrl+Alt+F9");
    addMenuItem("-", menuName, "");
    addMenuItem("JSHint Usage", menuName, "jSHintUsage");
    addMenuItem("JSHint About", menuName, "jSHintAbout");
    addMenuItem("-", menuName, "");
    addMenuItem("Edit JSHint Script File", menuName, "openScript");
    addMenuItem("-", menuName, "");
    setClipboardText(cbText + idTag);
  }
  else
  {
    cbText = cbText.replace(idTag, "");
    setClipboardText(cbText);
  }  
}
