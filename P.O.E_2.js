// Import required modules
import fs from 'fs';
import { fox } from 'fetchfox';
import axios from 'axios';
import csv from 'csv-parser';

const openaiApiKey = "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";  // Replace with your OpenAI API key

async function categorizeComment(comment) {
    try {
        const response = await axios.post("https://api.openai.com/v1/chat/completions", {
            model: "gpt-4-turbo",  // Use GPT-4 or latest available model
            messages: [
                { role: "system", content: "You are an AI assistant that categorizes user comments based on POE 2.0 categories." },
                { 
                    role: "user", 
                    content: `
                        Categorize the following comment based on these POE 2.0 categories:
                        
                        1. **Orientation & Navigation** – Wayfinding, ease of navigation, or getting lost.
                        2. **Architecture & Design** – Architectural form, layout, materials, spatial organization.
                        3. **Functionality** – How well the space serves its purpose, usability, operational efficiency.
                        4. **Social Aspects** – How the space fosters social interaction, community engagement.
                        5. **Aesthetics & Emotion** – Subjective experience, beauty, comfort, emotional response.

                        Also, determine if the comment is **Positive, Negative, or Neutral**.

                        **Comment:** "${comment}"

                        Respond in a structured JSON format:
                        {
                            "Orientation & Navigation": "Yes/No",
                            "Architecture & Design": "Yes/No",
                            "Functionality": "Yes/No",
                            "Social Aspects": "Yes/No",
                            "Aesthetics & Emotion": "Yes/No",
                            "Sentiment": "Positive/Negative/Neutral"
                        }
                    `
                }
            ],
            max_tokens: 150
        }, {
            headers: { "Authorization": `Bearer ${openaiApiKey}`, "Content-Type": "application/json" }
        });

        let content = response.data.choices[0].message.content.trim();
        // Remove potential backticks (` ```json {...} ``` `) if present
        content = content.replace(/^```json\s*/i, '').replace(/```$/, '');
        try {
            return JSON.parse(content);
        } catch (parseError) {
            console.error("JSON Parse Error:", parseError, "Response content:", content);
            return {
                "Orientation & Navigation": "Error",
                "Architecture & Design": "Error",
                "Functionality": "Error",
                "Social Aspects": "Error",
                "Aesthetics & Emotion": "Error",
                "Sentiment": "Error"
            };
        }

    } catch (error) {
        console.error("Error categorizing comment:", error.response ? error.response.data : error.message);
        return {
            "Orientation & Navigation": "Error",
            "Architecture & Design": "Error",
            "Functionality": "Error",
            "Social Aspects": "Error",
            "Aesthetics & Emotion": "Error",
            "Sentiment": "Error"
        };
    }
}


async function processBuilding(buildingName) {
    console.log(`\n🔍 Processing reviews for: ${buildingName}`);

    const allItems = [];

    const searchUrl = "http://localhost:3001/api/search";
    const payload = {
        chatModel: { provider: "openai", model: "gpt-4o-mini" },
        embeddingModel: { provider: "openai", model: "text-embedding-3-large" },
        optimizationMode: "speed",
        focusMode: "webSearch",
        query: `Give me example of people reviewing ${buildingName} with the sources`
    };

    try {
        const res = await fetch(searchUrl, { method: 'POST', headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const data = await res.json();


        function findUrls(text) {
            const matches = text.match(/https?:\/\/(?:[a-zA-Z0-9$-_@.&+!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]+))+/g);
            return matches || [];
        }

        

        const responseUrl = findUrls(JSON.stringify(data));
        if (responseUrl.length === 0) {
            console.log(`❌ No URLs found for ${buildingName}.`);
            return;
        }
        const responseUrls = responseUrl.map(urlStr => urlStr.replace(/'/g, ""));
        console.log(`✅ Extracted URLs for ${buildingName}:`);
        var i=1 
        responseUrls.forEach(x => { 
            console.log(i+'- '+ x)
            i=i+1
            
        });


        for (const url of responseUrls) {
            try {
                console.log(`🔗 Fetching reviews from: ${url}`);
                const workflow = await fox
                    .config({ ai: { model: 'openai:gpt-4o-mini', apiKey: openaiApiKey } })
                    .init(url)
                    .extract({ 
                      questions:{
                      url: 'URL of the page of comments and reviews', 
                      comments_heders: 'title of comments',
                      comments:'comments full text',
                      username: 'name of the user who wrote a comment', 
                      location:'location of name of the user who wrote a comment',
                      date: 'date of eveery the comments',
                      nextUrl: 'URL for next page' },
                      maxPages : 7
                  })
                    .limit(1000)
                    .plan();

                const results = await workflow.run(null, (delta) => console.log("Delta:", delta.item));

                if (results && results.items) {
                    for (const item of results.items) {
                        const categoryData = await categorizeComment(item.comments);
                        allItems.push({ sourceUrl: url, ...item, ...categoryData });
                    }
                }
            } catch (error) {
                console.error(`⚠️ Error processing URL ${url}:`, error);
            }
        }

        if (allItems.length > 0) {
            const sanitizedBuildingName = buildingName.replace(/[^a-zA-Z0-9]/g, "_");
            const filename = `${sanitizedBuildingName}.csv`;

            const csvHeader = 'sourceUrl,url,comments,username,date,Orientation & Navigation,Architecture & Design,Functionality,Social Aspects,Aesthetics & Emotion,Sentiment\n';
            let csvOutput = csvHeader;
            
            allItems.forEach(item => {
                csvOutput += `"${item.sourceUrl}","${item.url}","${item.comments}","${item.username}","${item.date}","${item["Orientation & Navigation"]}","${item["Architecture & Design"]}","${item["Functionality"]}","${item["Social Aspects"]}","${item["Aesthetics & Emotion"]}","${item["Sentiment"]}"\n`;
            });

            fs.writeFileSync(filename, csvOutput);
            console.log(`📂 Saved results to ${filename}`);
        } else {
            console.log(`❌ No reviews found for ${buildingName}.`);
        }

    } catch (error) {
        console.error(`⚠️ Error fetching review URLs for ${buildingName}:`, error);
    }
}

async function main() {
    const buildings = [];
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    fs.createReadStream('Buildings.csv')
        .pipe(csv())
        .on('data', (row) => {
            buildings.push(row.Building);
        })
        .on('end', async () => {
            for (const building of buildings) {
                await sleep(3000);  // Waits for 3 seconds
                console.log("Waited 300 seconds!");
                await processBuilding(building);
            }
        });
}

main();
