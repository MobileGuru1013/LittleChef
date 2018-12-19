/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var db = null;
var items = {};
var num = 0;
var application = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        application.receivedEvent('deviceready');
        initDB();
    },
    // Update DOM on a Received Event
    receivedEvent: function(id) {
        var func = function(){
            var parentElement = document.getElementById(id);
            var listeningElement = parentElement.querySelector('.listening');
            listeningElement.setAttribute('style', 'display:none;');
            $('.view').hide();
            $('.searchview').show();
            $(document).foundation();
            getRecommendations();
        };
        setTimeout(func,2000);
            
    }
};


function getRecommendations(){
    $.ajax({
        url: 'http://api.allthecooks.com/api/recipe/recommend.json',
        type: 'get',
        success: function (data) {
            console.log(data);
            $.each(data.result,function(key,reco){
                renderReco(reco);
            })
        }
    });
}

function search(query){
    $.ajax({
        url: 'http://api.allthecooks.com/api/recipe/search.json?filter=title&ordering=relevance&safe=true&size=25&start=0&v=7&q=' + query,
        type: 'get',
        success: function (data) {
            $('.result-container').html('');
            data = JSON.parse(data);
            console.log(data);
            $.each(data.result,function(key,reco){
                renderReco(reco);
            })
        }
    });
}
function renderReco(item){
    if(typeof items[item.id] == 'undefined') items[item.id] = item;
    var template = $('#recipeTemplate').html();
    var $html = $(_.template(template,item));
    $('.result-container').append($html);
    $html.find('.start-cooking-button').click(function(){
        var item = items[$(this).closest('.receipe_card').attr('rId')];
        insertItemData(item);
    });
}

function downloadFile(url, id){
    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, 
        function onFileSystemSuccess(fileSystem) {
            var sPath = cordova.file.externalRootDirectory;
            // var sPath = cordova.file.applicationStorageDirectory;
            var fileTransfer = new FileTransfer();
            fileTransfer.download(
                url,
                sPath + id + ".png",
                function(theFile) {
                    console.log("download complete: " + theFile.toURI());
                    console.log(theFile.toURI());
                },
                function(error) {
                    console.log("download error source " + error.source);
                    console.log("download error target " + error.target);
                    console.log("upload error code: " + error.code);
                }
            );        
        }, 
    function(){});
};   

function initDB(){
    db = window.sqlitePlugin.openDatabase({name: "recipe.db"});
    db.transaction(function(tx) {
        tx.executeSql("CREATE TABLE IF NOT EXISTS items (id integer primary key, data text, rId integer, ts integer);");
    });
}

function insertItemData(item){
    var imgLoadCallback = function(err, base64Img){
        db.transaction(function(tx) {
            console.log(base64Img);
            item['base64Img'] = base64Img;
            tx.executeSql("INSERT INTO items (rId, data, ts) VALUES (?,?,?)", [item.id,JSON.stringify(item), new Date().getTime()], function(tx, res) {
              console.log(res);
              console.log("rowsAffected: " + res.rowsAffected + " -- should be 1");
            }, function(e) {
              console.log("ERROR: " + e.message);
            });
        });
    };
    if(typeof item.markup != 'undefined') imgToDataURL("http://src.sencha.io/320/320/" + item.markup.coverMedia[0].url, imgLoadCallback)
    else imgLoadCallback(null,"");
}

function imgToDataURL(url, callback, outputFormat, quality) {
    var canvas = document.createElement('CANVAS'),
        ctx = canvas.getContext('2d'),
        img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function() {
        var dataURL;
        canvas.height = img.height;
        canvas.width = img.width;
        try {
            ctx.drawImage(img, 0, 0);
            dataURL = canvas.toDataURL(outputFormat, quality);
            callback(null, dataURL);
        } catch (e) {
            callback(e, null);
        }
        canvas = img = null;
    };
    img.onerror = function() {
        callback(new Error('Could not load image'), null);
    };
    img.src = url;
}
$(document).ready(function(){
    $('.searchButton').click(function(){
        var q = $('.queryText').val();
        if(q!='') search(q);
    });
});
