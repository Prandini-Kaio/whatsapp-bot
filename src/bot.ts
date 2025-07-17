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
            if(processedMessages.has(message.id)){
                console.log("[INFO] Duplicata identificada, ignorando...")
                return;
            }

            processedMessages.add(message.id);
            setTimeout(() => {
                processedMessages.delete(message.id)
            }, 5000);

            this.handleMessage(message);
        });

        this.client.onStateChange((state) => {
            console.log("[INFO] [STATE] Estado da sessão alterado: ", state);
        });
    }

    private async handleMessage(message: Message) {
        // Ignora mensagens privadas
        if(message.fromMe || message.chatId === 'status@broadcast' || !message.isGroupMsg || message.chatId !== this.GROUP_ID){
            return;
        }

        console.log("[INFO] Mensagem recebida: ", message.body)

        try {
            const payload = {
                sender: message.from,
                texto: message.body,
                timestamp: message.timestamp
            };

            console.log("[INFO] Enviando mensagem para a API...")
            let apiResponse;

            if(payload.texto.toLocaleLowerCase().includes("resumo")){
                apiResponse = await axios.post(this.API_ENDPOINT+"/resumo", payload);
            }else {
                apiResponse = await axios.post(this.API_ENDPOINT+"/financeiro", payload);
            }

            if(apiResponse.data && apiResponse.data.reply){
                this.sendMessage(this.GROUP_ID, apiResponse.data.reply);
            }
        }catch(error) {
            console.error('[ERROR] Erro ao processar a mensagem ou contatar a API:', error);
            this.sendMessage(this.GROUP_ID, 'Desculpe, não consegui processar sua solicitação no momento. Tente novamente mais tarde.');
        }
    }

    private async sendMessage(to: string, message: string) {
        console.log("[INFO] Enviando resposta para o client.");
        await this.client?.sendText(to, message);
    }
}

new WhatsAppBot();