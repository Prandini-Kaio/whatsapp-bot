import axios from "axios";
import { stat } from "fs";
import { create, CreateOptions, Message, Whatsapp } from "venom-bot";


const processedMessages = new Set<string>();

class WhatsAppBot {

    API_ENDPOINT = "http://127.0.0.1:5678/webhook"
    GROUP_ID = "120363418455891186@g.us"

    private client: Whatsapp | null = null;

    constructor() {
        const options: CreateOptions = {
            session: 'whatsapp-bot-session',
            devtools: false,
            debug: false,
            logQR: true,
            browserArgs: ['--no-sandbox'],
            puppeteerOptions: {}
        }

        this.initialize(options);
    }

    private initialize(options: CreateOptions){
        create(options)
            .then((client) => this.start(client))
            .catch((error) => console.error("Erro ao criar o cliente: ", error));
    }

    private start(client: Whatsapp){
        this.client = client;
        console.log("[INFO] Cliente Venom iniciado com sucesso!");

        this.client.onAnyMessage((message: Message) => {
            if(processedMessages.has(message.id) || !message.isGroupMsg){
                console.log("[INFO] Duplicata identificada, ignorando...")
                return;
            }

            processedMessages.add(message.id);
            setTimeout(() => {
                processedMessages.delete(message.id)
            }, 5000);

            if(message.isGroupMsg){
                this.handleGroupMessage(message)
            }
        });

        this.client.onMessage((message: Message)  => {
            if(processedMessages.has(message.id) || message.isGroupMsg){
                console.log("[INFO] Duplicata identificada, ignorando...")
                return;
            }

            processedMessages.add(message.id);
            setTimeout(() => {
                processedMessages.delete(message.id)
            }, 5000);

            if(!message.isGroupMsg){
                this.handleMessage(message)
            }
        })

        this.client.onStateChange((state) => {
            console.log("[INFO] [STATE] Estado da sessão alterado: ", state);
        });
    }

    private async handleMessage(message: Message) {
        // Ignora mensagens privadas
        if(message.fromMe || message.chatId === 'status@broadcast'){
            return;
        }

        console.log("[INFO] [PRIVATE] Mensagem recebida: ", message.body)

        try {
            const payload = {
                sender: message.from,
                texto: message.body,
                timestamp: message.timestamp
            };

            console.log("[INFO] [PRIVATE] Enviando mensagem para a API...")
            let apiResponse;

            apiResponse = await axios.post(this.API_ENDPOINT+"/financeiro/outros", payload);

            if(apiResponse.data && apiResponse.data.reply){
                this.sendMessage(this.GROUP_ID, apiResponse.data.reply);
            }
        }catch(error) {
            console.error('[ERROR] [PRIVATE] Erro ao processar a mensagem ou contatar a API:', error);
            this.sendMessage(message.from, 'Desculpe, não consegui processar sua solicitação no momento. Tente novamente mais tarde.');
        }
    }

    private async handleGroupMessage(message: Message) {
        if(message.fromMe || message.chatId === 'status@broadcast' || !message.isGroupMsg || message.chatId !== this.GROUP_ID){
            return;
        }

        console.log("[INFO] [GROUP] Mensagem recebida: ", message.body)

        try {
            const payload = {
                sender: message.from,
                texto: message.body,
                timestamp: message.timestamp
            };

            console.log("[INFO] [GROUP] Enviando mensagem para a API...")
            let apiResponse;

            apiResponse = await axios.post(this.API_ENDPOINT+"/financeiro", payload);

            if(apiResponse.data && apiResponse.data.reply){
                this.sendMessage(message.from, apiResponse.data.reply);
            }
        }catch(error) {
            console.error('[ERROR] [GROUP] Erro ao processar a mensagem ou contatar a API:', error);
            this.sendMessage(this.GROUP_ID, 'Desculpe, não consegui processar sua solicitação no momento. Tente novamente mais tarde.');
        }
    }

    private async sendMessage(to: string, message: string) {
        console.log("[INFO] Enviando resposta para " + to);
        await this.client?.sendText(to, message);
    }
}

new WhatsAppBot();