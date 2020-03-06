import config from 'config';
import MyDate from '../MyDate';

/**
 * Lambda の実行時パラメータを解釈
 */
export default class MyParameters {
    private static _instance: MyParameters;
    public event: { [s: string]: any };
    public defaultConfig: { [s: string]: any };
    public errors: string[] = [];
    [s: string]: any;
    private constructor(event: { [s: string]: any }) {
        this.event = event;
        this.defaultConfig = config;
    }

    public static getInstance(event: { [s: string]: any }): MyParameters {
        if (!MyParameters._instance) {
            MyParameters._instance = new MyParameters(event);
        }
        return MyParameters._instance;
    }

    /**
     * lambda の実行時パラメータを解釈してセットする
     * 優先順位 イベントパラメータ > 環境変数 > コードデフォルト値
     * @param {string} name - パラメータ名
     * @param {string} type - 型
     * @param {boolean} required - 必須フラグ
     */
    public setValue(name: string, type: string, required = false) {
        let error = '';
        let tmpValue =
            (this.event && this.event[name]) ||
            (process.env && process.env[name]) ||
            (this.defaultConfig && this.defaultConfig[name]) ||
            '';
        this[name] = undefined;
        switch (type) {
            case 'boolean':
                this[name] = !/(false|off|disable|no|none|0)/i.test(tmpValue);
                break;
            case 'number':
                tmpValue = Number(tmpValue);
                if (isNaN(tmpValue)) {
                    error = `parameter <${name}> is not a number.`;
                } else {
                    this[name] = tmpValue;
                }
                break;
            case 'Date':
                tmpValue = new MyDate(tmpValue);
                if (tmpValue.toString() === 'Invalid Date') {
                    error = `parameter <${name}> is not a valid Date.`;
                } else {
                    this[name] = tmpValue;
                }
                break;
            case 'string':
            default:
                tmpValue = String(tmpValue);
                if (tmpValue === 'undefined') {
                    error = `parameter <${name}> is not a valid string.`;
                } else {
                    this[name] = tmpValue;
                }
                break;
        }
        if (required && (typeof this[name] === 'undefined' || this[name] === '')) {
            this.addError(`parameter <${name}> is required but blank.`);
        }
        if (error !== '') {
            this.addError(error);
        }
    }

    public addError(errorValue: string) {
        if (!this.errors) {
            this.errors = [];
        }
        this.errors.push(errorValue);
    }
}
