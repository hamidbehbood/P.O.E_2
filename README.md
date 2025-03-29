# P.O.E_2

 Post Occupancy Evaluation(Automation with LLMs based on online reviews of people)

 In this project, I have used three different AI tools to achieve what we wanted: gather all the Reviews of people from the internet and categorize them into various categories.

 The first element is Perplexica :

 ## Perplexica :
 Perplexica is an open-source AI-powered searching tool or an AI-powered search engine that goes deep into the internet to find answers. Inspired by Perplexity AI, it's an open-source option that not just searches the web but understands your questions. It uses advanced machine learning algorithms like similarity searching and embeddings to refine results and provides clear answers with sources cited.

 **Installation:**

 There are mainly 2 ways of installing Perplexica - With Docker and without Docker. Here we are going to use the docker to install it on your machine :

 if you do not know what docker is, you  can visit <a href='https://docs.docker.com/get-started/docker-overview/'>here</a>
 for docker installation, you can visit <a href='https://www.docker.com/'> here </a> 
 
 ### Getting Started with Docker 
 Ensure Docker is installed and running on your system.

Clone the Perplexica repository:

git clone https://github.com/ItzCrazyKns/Perplexica.git
After cloning, navigate to the directory containing the project files.

Rename the sample.config.toml file to config.toml. For Docker setups, you need only fill in the following fields:

OPENAI: Your OpenAI API key. You only need to fill this if you wish to use OpenAI's models.

OLLAMA: Your Ollama API URL. You should enter it as http://host.docker.internal:PORT_NUMBER. If you installed Ollama on port 11434, use http://host.docker.internal:11434. For other ports, adjust accordingly. You need to fill this if you wish to use Ollama's models instead of OpenAI's.

GROQ: Your Groq API key. You only need to fill this if you wish to use Groq's hosted models.

ANTHROPIC: Your Anthropic API key. You only need to fill this if you wish to use Anthropic models.

Note: You can change these after starting Perplexica from the settings dialog.

SIMILARITY_MEASURE: The similarity measure to use (This is filled by default; you can leave it as is if you are unsure about it.)

Ensure you are in the directory containing the docker-compose.yaml file and execute:

docker compose up -d
Wait a few minutes for the setup to complete. You can access Perplexica at http://localhost:3000 in your web browser.
 
