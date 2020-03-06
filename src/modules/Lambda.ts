import * as AWS from 'aws-sdk';
import MyLogger from './MyLogger';
const Logger = MyLogger.getLogger();

/**
 * 子Lambdaを呼び出して結果を得るクラス
 */
export default class Lambda {
    private functionName: string;
    private payload: object;
    /**
     * コンストラクタ
     * @param {string} functionName - 子Lambda関数の名前
     * @param {Object} payload - {Key: value} 子Lambdaに送信するパラメータ
     */
    public constructor(functionName: string, payload: object) {
        this.functionName = functionName;
        this.payload = payload;
    }

    /**
     * 実行して結果を得る
     * @async
     * @returns {Promise<string>} - 子 Lambda関数の実行後に返したデータ
     */
    public async invoke(): Promise<string> {
        if (!this.functionName) {
            return '';
        }
        const lambda = new AWS.Lambda({ region: 'ap-northeast-1' });
        const subLambdaParams = {
            FunctionName: this.functionName,
            InvocationType: 'RequestResponse',
            Payload: JSON.stringify(this.payload),
        };
        let result;
        let resultObject;
        try {
            Logger.debug(`Lambda.invoke: child lambda function: ${subLambdaParams.FunctionName}`);
            result = await lambda.invoke(subLambdaParams).promise();
            Logger.debug('Lambda.invoke: got result');
        } catch (err) {
            Logger.error(`ERROR: ${err}`);
            Logger.error(
                `ERROR: Lambda.invoke / Something happend with parameters: ${JSON.stringify(subLambdaParams)}\n${err}`
            );
            throw err;
        }
        if (result) {
            let resultString = String(result.Payload);
            resultString = resultString.replace(/^"(.*)"$/, '$1').replace(/\\"/g, '"');
            resultObject = JSON.parse(resultString);
        }
        return resultObject;
    }
}
