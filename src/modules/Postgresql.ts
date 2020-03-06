import MyLogger from './MyLogger';
const Logger = MyLogger.getLogger();

// PostgreSQL を使う
export default class Postgresql {
    private pgConfig: {
        host: string;
        user: string;
        database: string;
        password: string;
        port: number;
    };
    private client: any;
    public connected: boolean;

    /**
     * コンストラクタ
     * @param {string} host - データベースホスト名 FQDN
     * @param {string} database - データベース名
     * @param {number} port - データベースのポート番号
     * @param {string} username - データベースの接続用ユーザ名
     * @param {string} password - データベースの接続用パスワード
     */
    constructor(host: string, database: string, port: number, username: string, password: string) {
        this.pgConfig = {
            host: host,
            user: username,
            database: database,
            password: password,
            port: port,
        };
        this.client = new (require('pg').Client)(this.pgConfig);
        this.connected = false;
    }

    /**
     * 接続する
     * @returns {boolean} - 成功した場合 真
     * @async
     */
    public async connect(): Promise<boolean> {
        try {
            Logger.debug('Postgresql.connect: connecting...');
            await this.client.connect();
            Logger.debug('Postgresql.connect: connected');
            this.connected = true;
            return this.connected;
        } catch (err) {
            this.pgConfig.password = this.pgConfig.password.replace(/./g, '*');
            Logger.error(`Postgresql.connect / ${JSON.stringify(this.pgConfig)}\n${err}`);
            throw err;
        }
    }
    /**
     * 切断する
     * @returns {boolean} - 成功した場合 真
     * @async
     */
    public async close(): Promise<boolean> {
        if (this.connected) {
            try {
                Logger.debug('Postgresql.close: disconnecting...');
                await this.client.end();
                Logger.debug('Postgresql.close: disconnected');
                this.connected = false;
            } catch (err) {
                this.pgConfig.password = this.pgConfig.password.replace(/./g, '*');
                Logger.error(`Postgresql.close / ${JSON.stringify(this.pgConfig)}\n${err}`);
                throw err;
            }
        }
        return !this.connected;
    }
    /**
     * SQL 文で問い合わせを行い、結果を得る
     * @param {string} queryString - 問い合わせ SQL 文字列
     * @returns {Object} - 結果オブジェクト
     * @async
     */
    public async query(queryString: string): Promise<any> {
        try {
            Logger.debug(`Postgresql.query: ${queryString}`);
            return await this.client.query(queryString);
        } catch (err) {
            Logger.error(`ERROR: PGDirect.query / ${JSON.stringify(queryString)}\n${err}`);
            throw err;
        }
    }
}
