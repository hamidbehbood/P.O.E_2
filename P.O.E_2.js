// Import required modules
import fs from 'fs';
import { fox } from 'fetchfox';
import axios from 'axios';
import csv from 'csv-parser';
import path from 'path';


// Import 'path' module to interact with file paths and 'URL' module to work with URL objects
const __dirname = path.dirname(new URL(import.meta.url).pathname); 
// The above line is used to get the directory path of the current module in an ES module environment.
// 'import.meta.url' gives the URL of the current module, and 'pathname' gives its file path.

const openaiApiKey = ""; 
// Store the OpenAI API key used for authentication when calling the OpenAI API.
// Replace the API key here with your own to connect to the OpenAI service.

// Asynchronous function that categorizes a user comment based on POE 2.0 categories
async function categorizeComment(comment) {
    try {
        //////////////////////  Here we are passing the collected reviews to the Chat-GPT as the final step for them to be categorized based on the POE 2 paper.

        // Send a POST request to the OpenAI API with the comment for categorization
        const response = await axios.post("https://api.openai.com/v1/chat/completions", {
            model: "gpt-4-turbo",  // Specify the GPT-4 Turbo model to be used for the categorization
            messages: [
                { 
                    role: "system", 
                    content: "You are an AI assistant that categorizes user comments based on POE 2.0 categories." 
                    // Provide system-level instruction to the AI to categorize comments according to POE 2.0 framework.
                },
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
                    // Provide the comment that needs to be categorized along with clear instructions on how to structure the response.
                    // The AI should categorize the comment into the POE 2.0 categories and also determine the sentiment.
                }
            ],
            max_tokens: 150
            // Limit the response from GPT-4 to a maximum of 150 tokens to avoid overly long responses.
        }, {
            headers: { "Authorization": `Bearer ${openaiApiKey}`, "Content-Type": "application/json" }
            // Send an authorization header with the OpenAI API key for authentication.
            // Set the content type of the request to 'application/json'.
        });


        

        // Extract the response content from the API response and trim any unnecessary whitespace
        let content = response.data.choices[0].message.content.trim();
        // Remove potential code block formatting (e.g., ```json {...} ```), if present in the response
        content = content.replace(/^```json\s*/i, '').replace(/```$/, '');
        
        try {
            // Attempt to parse the cleaned content as JSON
            return JSON.parse(content);
        } catch (parseError) {
            // If an error occurs during JSON parsing, log the error and return default error values
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
        // If any error occurs during the API request or processing, log the error and return default error values
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

// Asynchronous function that processes reviews for a given building
async function processBuilding(buildingName) {
    console.log(`\n🔍 Processing reviews for: ${buildingName}`); 
    // Log the building name to indicate the process is starting.

    const allItems = []; 
    // Initialize an empty array to store the processed review data.

    const searchUrl = "http://localhost:3001/api/search"; 
    // URL for making a search request to the server.

    // Define the payload (data) for the search request to retrieve reviews related to the building.
    const payload = {
        chatModel: { provider: "openai", model: "gpt-4o-mini" },
        embeddingModel: { provider: "openai", model: "text-embedding-3-large" },
        optimizationMode: "speed",
        focusMode: "webSearch",
        query: `Give me example of people reviewing ${buildingName} with the sources `
    };

    try {
        // Send a POST request to the search URL with the specified payload
        const res = await fetch(searchUrl, { method: 'POST', headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        // Wait for the response and parse it into JSON
        const data = await res.json();

        // Function to find all URLs in a given text
        function findUrls(text) {
            const matches = text.match(/https?:\/\/(?:[a-zA-Z0-9$-_@.&+!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]+))+/g);
            return matches || []; // Return the found URLs or an empty array if none are found
        }

        // Extract URLs from the JSON response data
        const responseUrl = findUrls(JSON.stringify(data));

        // Remove duplicate URLs if any
        if (responseUrl.length > 0) {
            for (let index = 0; index < responseUrl.length; index++) {
                for (let index1 = index + 1; index1 < responseUrl.length; index1++) {
                    if (responseUrl[index] == responseUrl[index1]) {
                        responseUrl.splice(index1, 1); // Remove duplicate URL
                    }
                }
            }
        }

        // Modify the extracted URLs to include potential next pages (pagination logic)
        const result = responseUrl.reduce((acc, item) => {
            // 1) Always keep the original URL
            acc.push(item);
            // 2) Look for URLs that contain the "page" keyword followed by a number
            const match = item.match(/(page)([\/=]?)(\d+)/i);

            if (match) {
                // 3) For matched URLs, generate new URLs for the next pages (up to 5 additional pages)
                for (let index = 1; index <= 5; index++) {
                    const [, word, sep, numStr] = match;
                    const counter = parseInt(numStr, 10) + index; // Increment the page number
                    const newItem = item.replace(
                        /(page)([\/=]?)(\d+)/i,
                        () => word + sep + counter
                    );
                    // 4) Append the new URL for the next page
                    acc.push(newItem);
                }
            }
            return acc;
        }, []); // Initialize the accumulator as an empty array

        // If no valid URLs are found, log an error and return
        if (result.length === 0) {
            console.log(`❌ No URLs found for ${buildingName}.`);
            return;
        }

        // Remove any duplicate URLs in the result array
        if (result.length > 0) {
            for (let index = 0; index < result.length; index++) {
                for (let index1 = index + 1; index1 < result.length; index1++) {
                    if (result[index] == result[index1]) {
                        result.splice(index1, 1); // Remove duplicate URL
                    }
                }
            }
        }

        // Clean up the URLs by removing any unwanted characters like single quotes
        const responseUrls = result.map(urlStr => urlStr.replace(/'/g, ""));
        console.log(`✅ Extracted URLs for ${buildingName}:`);

        // Log the extracted URLs for the building
        let i = 1;
        responseUrls.forEach(x => {
            console.log(i + '- ' + x);
            i = i + 1;
        });

        // Fetch reviews from each URL
        for (const url of responseUrls) {
            try {
                console.log(`🔗 Fetching reviews from: ${url}`);
                const workflow = await fox
                    .config({ ai: { model: 'openai:gpt-4o-mini', apiKey: openaiApiKey } })
                    .init(url) // Initialize the page URL for extracting data
                    .extract({
                        questions: {
                            url: 'URL of the page of comments and reviews',
                            comments_heders: 'title of comments',
                            comments: 'comments full text',
                            username: 'name of the user who wrote a comment',
                            location: 'location of name of the user who wrote a comment',
                            date: 'date of every the comments',
                            nextUrl: 'URL for next page'
                        },
                        maxPages: 7
                    })
                    .limit(1000)
                    .plan();

                const results = await workflow.run(null, (delta) => console.log("Delta:", delta.item));

                // If reviews are fetched successfully, process each review
                if (results && results.items) {
                    for (const item of results.items) {
                        // Categorize each comment based on POE 2.0 framework
                        const categoryData = await categorizeComment(item.comments);
                        allItems.push({ sourceUrl: url, ...item, ...categoryData });
                    }
                }
            } catch (error) {
                console.error(`⚠️ Error processing URL ${url}:`, error); 
                // Log an error if something goes wrong while fetching reviews for the URL
            }
        }

        // If reviews were found, save them to a CSV file
        if (allItems.length > 0) {
            const sanitizedBuildingName = buildingName.replace(/[^a-zA-Z0-9]/g, "_");
            const filename = `${sanitizedBuildingName}.csv`;

            // Define the CSV file header
            const csvHeader = 'sourceUrl,url,comments,username,date,Orientation & Navigation,Architecture & Design,Functionality,Social Aspects,Aesthetics & Emotion,Sentiment\n';
            let csvOutput = csvHeader;

            // Add each review to the CSV output
            allItems.forEach(item => {
                csvOutput += `"${item.sourceUrl}"|` +
                             `"${item.url}"|` +
                             `"${item.comments}"|` +
                             `"${item.username}"|` +
                             `"${item.date}"|` +
                             `"${item["Orientation & Navigation"]}"|` +
                             `"${item["Architecture & Design"]}"|` +
                             `"${item["Functionality"]}"|` +
                             `"${item["Social Aspects"]}"|` +
                             `"${item["Aesthetics & Emotion"]}"|` +
                             `"${item["Sentiment"]}"\n`;
            });

            // Write the CSV output to a file
            fs.writeFileSync(filename, csvOutput);
            console.log(`📂 Saved results to ${filename}`);
        } else {
            // If no reviews were found, log an error
            console.log(`❌ No reviews found for ${buildingName}.`);
        }

    } catch (error) {
        console.error(`⚠️ Error fetching review URLs for ${buildingName}:`, error);
        // If there is an error during the entire process, log the error message
    }
}


// Asynchronous main function that processes a list of buildings
async function main() {
    const buildings = []; 
    // Initialize an empty array to store the names of the buildings.

    // Helper function to pause the execution for a specified number of milliseconds
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
        // Returns a Promise that resolves after waiting for 'ms' milliseconds.
    }

    // Define the file path for the CSV file containing building names
    const filePath = path.join(__dirname, 'Buildings.csv'); 
    // 'path.join' ensures the file path is correctly constructed using the current directory (__dirname).

    // Check if the file exists before trying to read it
    if (!fs.existsSync(filePath)) {
        console.error(`The file 'Buildings.csv' was not found in the current directory: ${__dirname}`);
        return;
        // If the file doesn't exist, log an error message and stop the execution of the main function.
    }

    // Create a read stream to read the CSV file
    fs.createReadStream(filePath)
        .pipe(csv())  // Parse the CSV data as it is read from the file
        .on('data', (row) => {
            buildings.push(row.Building);  // Push the name of each building into the 'buildings' array
        })
        .on('end', async () => {
            // Once the entire CSV file has been read, start processing each building
            for (const building of buildings) {
                await sleep(3000);  // Wait for 3 seconds before processing the next building
                console.log("Waited 300 seconds!");
                await processBuilding(building); 
                // Call the 'processBuilding' function for each building, passing the building name.
            }
        });
}

// Call the main function to start the process
main();
