import * as AWS from 'aws-sdk';
import MyUtil from './MyUtil';
import MyLogger from './MyLogger';
const Logger = MyLogger.getLogger();

// Athena を使う
export default class Athena {
    private client: AWS.Athena;
    private outputLocationPath: string = '';
    private queryTimeoutSeconds: number;
    private queryExecutionId: string = '';
    public connected: boolean = false;

    public constructor(outputLocationPath: string, queryTimeoutSeconds: any = 60) {
        this.client = new AWS.Athena({
            region: 'ap-northeast-1',
        });
        this.outputLocationPath = outputLocationPath;
        this.queryTimeoutSeconds = isNaN(Number(queryTimeoutSeconds)) ? Number(queryTimeoutSeconds) : 60;
    }
    /**
     * 接続する（実際には何もしない）
     * @returns {boolean} - 成功した場合 真
     * @async
     */
    async connect(): Promise<boolean> {
        Logger.debug('Athena.connect: connected');
        return (this.connected = true);
    }
    /**
     * 切断する（実際には何もしない）
     * @returns {boolean} - 成功した場合 真
     * @async
     */
    async close(): Promise<boolean> {
        Logger.debug('Athena.close: disconnected');
        return (this.connected = false);
    }
    /**
     * SQL 文で問い合わせを行い、終了を待ち、結果を得る
     * @param {string} queryString - 問い合わせ SQL 文字列
     * @returns {Object} - 結果オブジェクト
     * @async
     */
    async query(queryString: string): Promise<object | undefined> {
        if (!queryString) {
            Logger.error('ERROR: Athena.query / No queryString');
            throw new Error('ERROR: Athena.query / No queryString');
        }

        Logger.trace(`Athena.query: "${queryString}"`);
        this.queryExecutionId = await this.startQueryExecution(queryString);
        Logger.debug(`Athena.query: queryExecutionId "${this.queryExecutionId}"`);
        if (await this.waitForQueryFinish()) {
            return await this.getQueryResults();
        }
    }
    /**
     * SQL 文で問い合わせを行う（開始）
     * @param {string} queryString - 問い合わせ SQL 文字列
     * @returns {stringList} - QueryExecutionId
     * @async
     */
    async startQueryExecution(queryString: string): Promise<string> {
        const params = {
            QueryString: queryString,
            ResultConfiguration: {
                OutputLocation: this.outputLocationPath,
            },
        };
        try {
            const result = await this.client.startQueryExecution(params).promise();
            return result.QueryExecutionId || '';
        } catch (err) {
            Logger.error(
                `ERROR: Athena.startQueryExecution / Something happend with parameters: ${JSON.stringify(
                    params
                )}\n${err}`
            );
            throw err;
        }
    }
    /**
     * SQL 文で問い合わせた結果を待つ
     * @returns {Promise} - 結果オブジェクト
     */
    async waitForQueryFinish(): Promise<boolean> {
        const params = { QueryExecutionId: this.queryExecutionId };
        let runningTime = 0;
        for (;;) {
            try {
                const result = await this.client.getQueryExecution(params).promise();
                Logger.debug(
                    `Athena.waitForQueryFinish: ${this.queryExecutionId} / ${result.QueryExecution &&
                        result.QueryExecution.Status &&
                        result.QueryExecution.Status.State} / ${runningTime} `
                );
                if (
                    typeof result.QueryExecution === 'undefined' ||
                    typeof result.QueryExecution.Status === 'undefined'
                ) {
                    return false;
                }
                if (result.QueryExecution.Status.State === 'SUCCEEDED') {
                    return true;
                } else if (result.QueryExecution.Status.State === 'FAILED') {
                    return false;
                } else {
                    await MyUtil.sleep(2000);
                    runningTime += 2;
                    if (runningTime > this.queryTimeoutSeconds) {
                        return false;
                    }
                }
            } catch (err) {
                Logger.error(
                    `ERROR: Athena.waitForQueryFinish / Something happend with parameters: ${JSON.stringify(
                        params
                    )}\n${err}`
                );
                throw err;
            }
        }
    }
    /**
     * SQL 文で問い合わせた結果を得る
     * @param {string} nextToken - 実行したクエリ結果の続きを得るためのトークン文字列
     * @returns {Object} - 結果オブジェクト(Athena)
     * @async
     */
    async getQueryResults(nextToken: string = ''): Promise<AWS.Athena.GetQueryResultsOutput | undefined> {
        const params: {
            QueryExecutionId: string;
            MaxResults: number;
            [NextToken: string]: any;
        } = {
            QueryExecutionId: this.queryExecutionId,
            MaxResults: 1000,
        };
        if (nextToken !== '') {
            params.NextToken = nextToken;
        }
        Logger.debug(`Athena.getQueryResults queryExecutionId: ${this.queryExecutionId} / nextToken: ${nextToken}`);
        let result;
        try {
            const check = await this.client.getQueryExecution({ QueryExecutionId: this.queryExecutionId }).promise();
            if (typeof check.QueryExecution === 'undefined' || typeof check.QueryExecution.Status === 'undefined') {
                return result;
            }
            if (check.QueryExecution.Status.State !== 'SUCCEEDED') {
                // もし終了していない場合は再度待つ
                await this.waitForQueryFinish();
            }
            result = await this.client.getQueryResults(params).promise();
        } catch (err) {
            Logger.error(
                `ERROR: Athena.getQueryResults / Something happend with parameters: ${JSON.stringify(params)}\n${err}`
            );
            throw err;
        }
        return result;
    }
}
