import * as AWS from 'aws-sdk';
import * as FS from 'fs';
import MyLogger from './MyLogger';
const XLSX = require('xlsx-populate');

const S3 = new AWS.S3({ apiVersion: '2006-03-01' });
const Logger = MyLogger.getLogger();

/**
 * S3 関連メソッドまとめ
 */
export default class S3Util {
    public static BUCKET_RESTRICTION_PATTERN: string = '';
    public static DEFAULT_BASE: string = '';

    /**
     * s3://bucket/key 形式から Bucket を取り出す
     * @static
     * @param {string} [s3_url=''] - S3URL
     * @returns {string} - S3 Bucket
     * @memberof S3Util
     */
    public static getBucket(s3_url: string = ''): string {
        Logger.trace(`S3Util.getBucket param: ${s3_url}`);
        if (s3_url === '') return '';
        const re = /^[sS]3:\/\/([a-z0-9][a-z0-9-]{1,61}[^-])\//;
        if (re.test(String(s3_url))) {
            const matchResult = String(s3_url).match(re);
            Logger.debug(`S3Util.getBucket matchResult: ${matchResult}`);
            return matchResult && matchResult.length > 0 ? matchResult[1] : '';
        }
        return '';
    }

    /**
     * s3://bucket/key 形式から Key を取り出す
     * @static
     * @param {string} [s3_url=''] - S3URL
     * @returns {string} - S3 Key
     * @memberof S3Util
     */
    public static getKey(s3_url: string = ''): string {
        Logger.trace(`S3Util.getKey param: ${s3_url}`);
        if (s3_url === '') return '';
        const re = /^[sS]3:\/\/[a-z0-9][a-z0-9-]{1,61}[^-]\/(.+)$/i;
        if (re.test(String(s3_url))) {
            const matchResult = String(s3_url).match(re);
            Logger.debug(`S3Util.getKey matchResult: ${matchResult}`);
            return matchResult && matchResult.length > 0 ? matchResult[1].replace(/\/\/+/g, '/') : '';
        }
        return '';
    }

    /**
     * S3URLを得る
     * パラメータが s3://～形式で BUCKET_RESTRICTION_PATTERN に合致していればそのまま返す
     * そうでなければ DEFAULT_BASE にパラメータを追記して返す
     * @static
     * @param {string} [value=''] - S3URL全体またはKey部分
     * @returns {string} - S3://～
     * @memberof S3Util
     */
    public static makeS3URL(value: string = ''): string {
        const re = /^[sS]3:\/\/[a-z0-9][a-z0-9-]{1,61}[^-]\/?/;
        if (re.test(value)) {
            // s3 url style
            if (this.isValidURL(value)) {
                return 's3://' + this.getBucket(value) + '/' + this.getKey(value);
            } else {
                throw new Error(
                    `ERROR: S3Util.makeS3URL / The specified url is not valid for current restriction. input: ${value}`
                );
            }
        } else {
            // not s3 url style
            return 's3://' + this.getBucket(this.DEFAULT_BASE + value) + '/' + this.getKey(this.DEFAULT_BASE + value);
        }
    }

    /**
     * S3URLが正しい形式か評価
     * 形式のみ判断する
     * 実際に存在する Bucket/Key かどうかは判断しない
     * @static
     * @param {string} [s3_url=''] - S3URL S3://～
     * @returns {boolean} - 評価結果
     * @memberof S3Util
     */
    public static isValidURL(s3_url: string = ''): boolean {
        if (new RegExp(this.BUCKET_RESTRICTION_PATTERN).test(this.getBucket(s3_url))) {
            Logger.debug(`S3Util.isValidURL test: OK with ${this.BUCKET_RESTRICTION_PATTERN}`);
            return this.getBucket(s3_url) !== '';
        } else {
            Logger.debug(`S3Util.isValidURL test: NG with ${this.BUCKET_RESTRICTION_PATTERN}`);
            return false;
        }
    }

    /**
     * S3 の URL 省略時に使われるベース URL を設定する
     * @static
     * @param {string} [s3_url=''] - S3URL S3://～
     * @returns {string} - 設定された S3URL
     * @memberof S3Util
     */
    public static setDefaultBase(s3_url: string = ''): string {
        Logger.trace(`S3Util.setDefaultBase param: ${s3_url}`);
        if (this.isValidURL(s3_url)) {
            Logger.trace('S3Util.setDefaultBase valid url');
            let tmpUtl = 's3://' + this.getBucket(s3_url) + '/' + this.getKey(s3_url);
            if (!/\/$/.test(tmpUtl)) {
                tmpUtl += '/';
            }
            return (this.DEFAULT_BASE = tmpUtl);
        }
        return '';
    }

    /**
     * 指定の Excelブック を S3 から開いて指定のシートを取り出す
     * @static
     * @async
     * @param {AWS.S3.GetObjectRequest} s3_params - S3 Parameters Object
     * @param {string} [sheet_name=''] - 対象のシート名
     * @returns {Promise<any>} - xlsx-populate Worksheet Object
     * @memberof S3Util
     */
    public static async getExcelSheetFromS3(s3_params: AWS.S3.GetObjectRequest, sheet_name: string = ''): Promise<any> {
        if (!s3_params || !sheet_name) {
            Logger.debug(
                `S3Util.getExcelSheetFromS3 / params: ${JSON.stringify(s3_params)} , sheet_name: ${sheet_name}`
            );
            throw new Error('ERROR: S3Util.getExcelSheetFromS3 / Not enough parameters');
        }
        let workbook;
        try {
            Logger.trace(`S3Util.GetExcelSheetFromS3: ${JSON.stringify(s3_params)}`);
            const data = await S3.getObject(s3_params).promise();
            workbook = await XLSX.fromDataAsync(new Uint8Array(<Buffer>data.Body));
        } catch (err) {
            Logger.error(`S3Util.getExcelSheetFromS3 / ${JSON.stringify(s3_params)}\n${err}`);
            throw err;
        }
        const sheet_settings = workbook.sheet(sheet_name);
        if (!sheet_settings) {
            Logger.error(`S3Util.getExcelSheetFromS3 / The target EXCEL sheet "${sheet_name}" not found.`);
            throw new Error(`ERROR: S3Util.getExcelSheetFromS3 / The target EXCEL sheet "${sheet_name}" not found.`);
        }
        return sheet_settings;
    }

    /**
     * S3 内でオブジェクトをコピーする
     * @static
     * @async
     * @param {AWS.S3.CopyObjectRequest} s3_params - S3 Parameters Object
     * @returns {Promise<any>} - Promise
     * @memberof S3Util
     */
    public static async copyFileInS3(s3_params: AWS.S3.CopyObjectRequest) {
        if (!s3_params) {
            Logger.debug(`S3Util.copyFileInS3 / params: ${JSON.stringify(s3_params)}`);
            throw new Error('ERROR: S3Util.copyFileInS3 / No parameters');
        }
        try {
            Logger.trace(`S3Util.CopyFileInS3: ${JSON.stringify(s3_params)}`);
            const result = await S3.copyObject(s3_params).promise();
            Logger.trace(`S3Util.CopyFileInS3 result: ${JSON.stringify(result)}`);
        } catch (err) {
            Logger.error(
                `S3Util.copyFileInS3 / Something happend with parameters: ${JSON.stringify(s3_params)}\n${err}`
            );
            throw err;
        }
    }

    /**
     * S3 内のオブジェクトをローカルにコピーする
     * @static
     * @async
     * @param {AWS.S3.GetObjectRequest} s3_params - S3 Parameters Object
     * @param {string} localStorePath - Local Path
     * @returns {Promise<any>} - Promise
     * @memberof S3Util
     */
    public static async copyFileFromS3ToLocal(s3_params: AWS.S3.GetObjectRequest, localStorePath: string) {
        if (!s3_params || !localStorePath) {
            Logger.debug(
                `S3Util.copyFileFromS3ToLocal / params: ${JSON.stringify(s3_params)}, localStorePath: ${localStorePath}`
            );
            throw new Error('ERROR: S3Util.copyFileFromS3ToLocal / No parameters');
        }
        try {
            Logger.trace(`S3Util.CopyFileFromS3ToLocal: ${JSON.stringify(s3_params)}`);
            const data = await S3.getObject(s3_params).promise();
            Logger.trace(`S3Util.CopyFileFromS3ToLocal getObject ContentLength: ${JSON.stringify(data.ContentLength)}`);
            const fileName = s3_params.Key.split('/').pop();
            FS.writeFileSync(localStorePath + fileName, data.Body);
            Logger.trace(`S3Util.CopyFileFromS3ToLocal saved as: ${localStorePath + fileName}`);
        } catch (err) {
            Logger.error(
                `S3Util.CopyFileFromS3ToLocal / Something happend with parameters: ${JSON.stringify(s3_params)}\n${err}`
            );
            throw err;
        }
    }

    /**
     * ローカルから S3 にオブジェクトをコピーする
     * @static
     * @async
     * @param {AWS.S3.PutObjectRequest} s3_params - S3 Parameters Object
     * @returns {Promise<boolean>} - 成功/失敗
     * @memberof S3Util
     */
    public static async copyFileFromLocalToS3(s3_params: AWS.S3.PutObjectRequest): Promise<boolean> {
        if (!s3_params) {
            Logger.debug(`S3Util.copyFileFromLocalToS3 / params: ${JSON.stringify(s3_params)}`);
            throw new Error('ERROR: S3Util.copyFileFromLocalToS3 / No parameters');
        }
        try {
            Logger.trace(`S3Util.copyFileFromLocalToS3: ${s3_params.Key}`);
            const result = await S3.putObject(s3_params).promise();
            Logger.trace(`S3Util.copyFileFromLocalToS3: result: ${result.ETag}`);
        } catch (err) {
            Logger.error(
                `S3Util.copyFileFromLocalToS3 / Something happend with parameters: ${JSON.stringify(s3_params)}\n${err}`
            );
            throw err;
        }
        return true;
    }

    /**
     * S3 のオブジェクトを削除する
     * @static
     * @async
     * @param {AWS.S3.DeleteObjectRequest} s3_params - S3 Parameters Object
     * @returns {Promise<boolean>} - 成功/失敗
     * @memberof S3Util
     */
    public static async deleteFileInS3(s3_params: AWS.S3.DeleteObjectRequest): Promise<boolean> {
        if (!s3_params) {
            Logger.debug(`S3Util.deleteFileInS3 / params: ${JSON.stringify(s3_params)}`);
            throw new Error('ERROR: S3Util.deleteFileInS3 / No parameters');
        }
        try {
            Logger.trace(`S3Util.deleteFileInS3: ${JSON.stringify(s3_params)}`);
            const result = await S3.deleteObject(s3_params).promise();
            S3.deleteObject().promise();
            Logger.trace(`S3Util.deleteFileInS3 result: ${JSON.stringify(result)}`);
        } catch (err) {
            Logger.error(
                `S3Util.deleteFileInS3 / Something happend with parameters: ${JSON.stringify(s3_params)}\n${err}`
            );
            throw err;
        }
        return true;
    }

    /**
     * (School専用) S3 にファイルを分別してコピー（SV別）
     * @static
     * @async
     * @param {string} localStorePath - ローカルのファイル保存パス
     * @param {string} fileName - コピーするファイル名
     * @param {string} bucketKey - コピー宛先の S3URL
     * @param {string} sv - スーパーバイザー名
     * @param {string} fc - FCオーナー名
     * @memberof S3Util
     */
    public static async copyExcelFileToS3ByClassInfo_SV(
        localStorePath: string,
        fileName: string,
        bucketKey: string,
        sv: string,
        fc: string
    ) {
        const s3params = {
            Bucket: this.getBucket(bucketKey),
            Key: this.getKey(bucketKey) + sv + '/' + fc + '/' + fileName,
            Body: FS.readFileSync(`${localStorePath}${fileName}`),
        };
        await this.copyFileFromLocalToS3(s3params);
    }

    /**
     * (School専用) S3 にファイルを分別してコピー（FC別）
     * @static
     * @async
     * @param {string} localStorePath - ローカルのファイル保存パス
     * @param {string} fileName - コピーするファイル名
     * @param {string} bucketKey - コピー宛先の S3URL
     * @param {string} fc - FCオーナー名
     * @memberof S3Util
     */
    public static async copyExcelFileToS3ByClassInfo_FC(
        localStorePath: string,
        fileName: string,
        bucketKey: string,
        fc: string
    ) {
        const s3params = {
            Bucket: this.getBucket(bucketKey),
            Key: this.getKey(bucketKey) + fc + '/' + fileName,
            Body: FS.readFileSync(`${localStorePath}${fileName}`),
        };
        await this.copyFileFromLocalToS3(s3params);
    }
}
