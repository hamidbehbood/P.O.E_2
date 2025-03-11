// Import required modules
import fs from 'fs';
import { fox } from 'fetchfox';
import axios from 'axios';

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

async function main() {
    const searchUrl = "http://localhost:3001/api/search";

    const payload = {
        chatModel: { provider: "openai", model: "gpt-4o-mini" },
        embeddingModel: { provider: "openai", model: "text-embedding-3-large" },
        optimizationMode: "speed",
        focusMode: "webSearch",
        query: "give me example of people reviewing dusseldorf Airport  with yelp",
        history: [
            ["human", "Hi, how are you?"],
            ["assistant", "I am doing well, how can I help you today?"]
        ]
    };

    const headers = { "Content-Type": "application/json" };

    try {
        const res = await fetch(searchUrl, { method: 'POST', headers, body: JSON.stringify(payload) });
        console.log("Status Code:", res.status);
        const data = await res.json();
        console.log("Response:", data);

        function findUrls(text) {
            const matches = text.match(/https?:\/\/(?:[a-zA-Z0-9$-_@.&+!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]+))+/g);
            return matches || [];
        }

        const responseText = JSON.stringify(data);
        const responseUrls = findUrls(responseText);
        if (responseUrls.length === 0) {
            console.log("No URLs found in the response.");
            return;
        }

        const URL_final = responseUrls.map(urlStr => urlStr.replace(/'/g, ""));
        console.log("Extracted URLs:", URL_final);

        fs.writeFileSync('Uriii1.csv', URL_final.join(','));
        console.log('Extracted URLs saved to Uriii1.csv');

        const allItems = [];

 // Define CSV Header (only once, before the loop)
 const rawCsvHeader = 'sourceUrl,url,comments,username,date\n';
 let rawCsvOutput = rawCsvHeader;

 for (const url of URL_final) {
    try {
        console.log(`Processing URL: ${url}`);
        const workflow = await fox
            .config({ ai: { model: 'openai:gpt-4o-mini', apiKey: "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" } })
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
                maxPages : 5
            })
            .limit(100)
            .plan()
            ;

        const results = await workflow.run(null, (delta) => { console.log("Delta:", delta.item); });

        if (results && results.items) {
            for (const item of results.items) {
                // Save raw comment data before categorization
                const sourceUrl = `"${(url || "").replace(/"/g, '""')}"`;
                const Url = `"${(item.url || "").replace(/"/g, '""')}"`;
                const comments = `"${(item.comments || "").replace(/"/g, '""')}"`;
                const comments_heders = `"${(item.comments_heders || "").replace(/"/g, '""')}"`;
                const username = `"${(item.username || "").replace(/"/g, '""')}"`;
                const date = `"${(item.date || "").replace(/"/g, '""')}"`;
                const location = `"${(item.location || "").replace(/"/g, '""')}"`;

                rawCsvOutput += `${sourceUrl},${Url},${comments_heders},${comments},${username},${date},${location}\n`;

                // Categorize the comment
                const categoryData = await categorizeComment(item.comments);
                allItems.push({ sourceUrl: url, ...item, ...categoryData });
                console.log('Item added with category:', { sourceUrl: url, ...item, ...categoryData });
            }
        }
    } catch (error) {
        console.error(`Error processing URL ${url}:`, error);
    }
 }

 // Save raw comments to a separate CSV file
 fs.writeFileSync('raw_comments.csv', rawCsvOutput);
 console.log("Raw comments saved to raw_comments.csv");

        const csvHeader = 'sourceUrl,url,comments_heders,comments,username,date,location,Orientation & Navigation,Architecture & Design,Functionality,Social Aspects,Aesthetics & Emotion,Sentiment\n';
        let csvOutput = csvHeader;
        
        allItems.forEach(item => {
            const sourceUrl = `"${(item.nextUrl || "").replace(/"/g, '""')}"`;
            const Url = `"${(item.url || "").replace(/"/g, '""')}"`;
            const comments_heders = `"${(item.comments_heders || "").replace(/"/g, '""')}"`;
            const comments = `"${(item.comments || "").replace(/"/g, '""')}"`;
            const username = `"${(item.username || "").replace(/"/g, '""')}"`;
            const date = `"${(item.date || "").replace(/"/g, '""')}"`;
            const location = `"${(item.location || "").replace(/"/g, '""')}"`;
            const orientationNav = item["Orientation & Navigation"] || "No";
            const archDesign = item["Architecture & Design"] || "No";
            const functionality = item["Functionality"] || "No";
            const socialAspects = item["Social Aspects"] || "No";
            const aestheticsEmotion = item["Aesthetics & Emotion"] || "No";
            const sentiment = item["Sentiment"] || "Neutral";

            csvOutput += `${sourceUrl},${Url},${comments_heders},${comments},${username},${date},${location},${orientationNav},${archDesign},${functionality},${socialAspects},${aestheticsEmotion},${sentiment}\n`;
        });

        fs.writeFileSync('categorized_comments.csv', csvOutput);
        console.log("Categorized comments saved to categorized_comments.csv");

    } catch (error) {
        console.error("Error during processing:", error);
    }
}

main();
