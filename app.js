var restify = require('restify');
var builder = require('botbuilder');
var botbuilder_azure = require("botbuilder-azure");
var request = require('request');
var querystring = require('querystring');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    openIdMetadata: process.env.BotOpenIdMetadata 
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());


var tableName = 'botdata';
var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);
var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);

// Analyze video indexer
var bot = new builder.UniversalBot(connector, function (session){
    var msg = session.message;
    if (msg.attachments.length){
        var attach = msg.attachments[0];
        var vindexer = require("video-indexer");
        var Vindexer = new vindexer("fea5c42ffe9a413b9fb0710e544ee6a5");
        session.send(attach.contentUrl);
        
        Vindexer.uploadVideo({
        // Optional
        videoUrl: attach.contentUrl,
        name: 'My video name',
        privacy: 'Private', 
        language: 'English', 
        externalId: 'customvideoid',
        description: 'Check out this great demo video!',
        partition: 'demos'
        }).then( function(result){ session.send(result.body) } );
    }
});

bot.set('storage', tableStorage);

// Make sure you add code to validate these fields
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v2.0/apps/' + luisAppId + '?subscription-key=' + luisAPIKey;

// Create a recognizer that gets intents from LUIS, and add it to the bot
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
bot.recognizer(recognizer);

// Greeting
bot.dialog('GreetingDialog', [
    function(session){
        const getGreetings = require('./getGreeting.js');
        session.send(getGreetings());
        builder.Prompts.choice(session, "Do you have any target company yet?", "Yes|No" , { listStyle: builder.ListStyle.button });
    }, function(session, result){
        if (result.response.entity == 'Yes'){
            session.send('Awesome. Tell me about your target company');
        }
        else{
            session.send('No Problem. Let me help you to find a good position.');
            session.send('Please tell me your major.');
        }
    }
]).triggerAction({
    matches: 'greeting'
})

bot.dialog('AskCompany', 
    function(session, args, next){
        var company = builder.EntityRecognizer.findEntity(args.intent.entities, 'Company');
        if (company.entity == 'amazon'){
            session.beginDialog('amazon');
        }
        if (company.entity == 'microsoft'){
            session.beginDialog('microsoft');
        }
        if (company.entity == 'google'){
            session.beginDialog('google');
        }
        if (company.entity == 'facebook'){
            session.beginDialog('facebook');
        }
}).triggerAction({
    matches: 'Target'
})

bot.dialog('amazon', [
    function (session){
        builder.Prompts.choice(session, 'Here are the current opennings in Amazon', "Data Scientist - NLP(20)|Data Scientist - Motion Planning(15)|FrontEnd Developer(25)|Backend Developer(24)|Full Stack(24)",{ listStyle: builder.ListStyle.button });
    },
    function (session, result){
        var option = result.response.entity;
        if (option == 'Data Scientist - NLP(20)' || option == 'Data Scientist - Motion Planning(15)'){
            session.send('This job requires some machine vision skills. I suggest you put more highlights of your experiences on this (Research Project may be a good choice).');
        }
        else{
            session.send('This job requires more programming skills. I suggest you put more highlights of your experiences on this (Work experiences will be advantage).');
        }
        session.beginDialog('Continue');
        }
])

bot.dialog('facebook', [
    function (session){
        builder.Prompts.choice(session, 'Here are the current opennings in Facebook', "AI Research(20)|Data Scientist - Motion Planning(15)|FrontEnd Developer(25)|Backend Developer(24)|Full Stack(24)",{ listStyle: builder.ListStyle.button });
    },
    function (session, result){
        var option = result.response.entity;
        if (option == 'AI Research(20)' || option == 'Data Scientist - Motion Planning(15)'){
            session.send('This job requires some machine vision skills. I suggest you put more highlights of your experiences on this (Research Project may be a good choice).');
        }
        else{
            session.send('This job requires more programming skills. I suggest you put more highlights of your experiences on this (Work experiences will be advantage).');
        }
         session.beginDialog('Continue');
        }
])

bot.dialog('google', [
    function (session){
        builder.Prompts.choice(session, 'Here are the current opennings in Google', "Google Brain(20)|NLU Team(15)|FrontEnd Developer(25)|Backend Developer(24)|Full Stack(24)",{ listStyle: builder.ListStyle.button });
    },
    function (session, result){
        var option = result.response.entity;
        if (option == 'Google Brain(20)' || option == 'NLU Team(15)'){
            session.send('This job requires some machine vision skills. I suggest you put more highlights of your experiences on this (Research Project may be a good choice).');
        }
        else {
            session.send('This job requires more programming skills. I suggest you put more highlights of your experiences on this (Work experiences will be advantage).');
        }
         session.beginDialog('Continue');
        }
])

bot.dialog('microsoft', [
    function (session){
        builder.Prompts.choice(session, 'Here are the current opennings in Microsoft', "Cognitive Services(20)|Video Indexer(15)|FrontEnd Developer(25)|Backend Developer(24)|Full Stack(24)",{ listStyle: builder.ListStyle.button });
    },
    function (session, result){
        var option = result.response.entity;
        if (option == 'Cognitive Services(20)' || option == 'Video Indexer(15)'){
            session.send('This job requires some machine vision skills. I suggest you put more highlights of your experiences on this (Research Project may be a good choice).');
        }
        else{
            session.send('This job requires more programming skills. I suggest you put more highlights of your experiences on this (Work experiences will be advantage).');
        }
         session.beginDialog('Continue');
        }
])

// Find job:
var cs_exp, re_exp, yearCS, major;
bot.dialog('major',
    function (session, args){
        var major = builder.EntityRecognizer.findEntity(args.intent.entities, 'subject');
        if (major.entity == 'economics'){
            session.beginDialog('eco');
            //session.userData.major = 0;
        }
        if (major.entity == 'engineering'){
            session.beginDialog('eng');
            //session.userData.major = 1;
        }
        if (major.entity == 'cs' || 'computer science'){
            session.beginDialog('cs');
            //session.userData.major = 2;
        }
    }
).triggerAction({
    matches: 'major'
})

bot.dialog('cs', [
    function (session){
        builder.Prompts.choice(session, "Do you have any programming experiences?", "Yes|No", { listStyle: builder.ListStyle.button });
    }, function(session, results){
        switch(results.response.index){
            case 0:
                session.beginDialog('YearCS');
                session.userData.cs_exp = 1;
                break;
            
            case 1:
                session.beginDialog('Project');
                session.userData.cs_exp = 0;
                break;

            default:
                session.endDialog();
                break;
        }
    }
])

bot.dialog('YearCS',[
    function (session){
        builder.Prompts.number(session, "How many years you have worked in CS? ");
    },function(session, results){
        session.userData.yearCS = results.response;
        session.beginDialog('Project');
    }
])

bot.dialog('Project', [
    function (session){
        builder.Prompts.choice(session, "Do you have any research experiences?", "Yes|No", { listStyle: builder.ListStyle.button });
    }, function (session, results){
        switch(results.response.index){
            case 0:
                session.userData.re_exp = 1;
                session.beginDialog('sg');
                break;
            
            case 1:
                session.userData.re_exp = 0;
                session.beginDialog('sg');
                break;

            default:
                session.endDialog();
                break;
        }
    }
])

bot.dialog('sg',
    function (session){
        if (session.userData.cs_exp && session.userData.yearCS > 4 && session.userData.re_exp){
            session.send("Since you have experience in programming and research, do you want to become a research scientist.");
            session.send("Another good option is trying with software developer");
            session.send("Make sure in your resume highlights this part. You can add a video in your AR resume so company will know better about you");
            session.send({
                text: "Here is an sample of research scientist",
                attachments: [
                    {
                        contentType: 'image/png',
                        contentUrl: 'https://preview.ibb.co/jee0Oc/research_scientist_midlevel.jpg',
                        name: 're1.jpg' 
                    }
                ]
            });
        }
        if (!session.userData.cs_exp && session.userData.re_exp){
            session.send("From your experience, I recommend you to take position in research direction");
            session.send("For your resume, it will be good if you focus on expressing your research experience");
            session.send({
                text: "Here is an sample of research scientist",
                attachments: [
                    {
                        contentType: 'image/png',
                        contentUrl: 'https://preview.ibb.co/jee0Oc/research_scientist_midlevel.jpg',
                        name: 're1.jpg' 
                    }
                ]
            });
        } 
        if (session.userData.cs_exp && session.userData.yearCS < 4 && !session.userData.re_exp){
            session.send("Since you have experience in programming and research, do you want to become a research scientist.");
            session.send("Another good option is trying with software developer");
            session.send("Make sure in your resume highlights this part. You can add a video in your AR resume so company will know better about you");
            session.send({
                text: "Here is an sample of software developer",
                attachments: [
                    {
                        contentType: 'image/png',
                        contentUrl: 'https://preview.ibb.co/d6QkpH/software_engineer_it_emphasis_1.jpg',
                        name: 're2.jpg' 
                    }
                ]
            });
        }
        session.send('Do you need anything else?');   
    }
)

bot.dialog('Continue', 
    function (session) {
        session.send("If you want to continue, just type another target company");
        session.send("We can also review you intro video.");
})

bot.dialog('endConversation',
    (session) => {
        const ends = require('./end.js');
        session.send(ends());
        session.endDialog();
    }
).triggerAction({
    matches: 'End'
})


