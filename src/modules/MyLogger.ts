import * as log4js from 'log4js';
import MyDate from './MyDate';

/**
 * ログ記録
 */

class LogItem {
    public level: number = MyLogger.LEVEL.INFO;
    public message: string;
    public timestamp: MyDate;
    public constructor(message: string = '', level?: number) {
        const now = new MyDate();
        if (typeof level !== 'undefined') {
            this.level = level;
        }
        this.message = message;
        this.timestamp = now;
    }
    public get log(): string {
        return <string>(
            `[${this.timestamp.getFormattedString('YYYY/MM/DD hh:mm:ss.ms')}] [${MyLogger.LEVEL[this.level]}] ${
                this.message
            }`
        );
    }
}

class MyLogger {
    private static _instance: MyLogger;
    private _logs: LogItem[] = [];
    private _logger: log4js.Logger;
    private _level: number = 3;

    private constructor() {
        this._logger = log4js.getLogger();
    }

    public static getLogger() {
        if (!MyLogger._instance) {
            MyLogger._instance = new MyLogger();
        }
        return MyLogger._instance;
    }
    public get level(): string {
        return MyLogger.LEVEL[this._level];
    }
    public set level(level: string) {
        switch (level) {
            case 'fatal': {
                this._level = 0;
                break;
            }
            case 'error': {
                this._level = 1;
                break;
            }
            case 'warn': {
                this._level = 2;
                break;
            }
            case 'info': {
                this._level = 3;
                break;
            }
            case 'debug': {
                this._level = 4;
                break;
            }
            case 'trace': {
                this._level = 5;
                break;
            }
            default: {
                this._level = 3;
            }
        }
    }

    /**
     * ログ文字列取得
     * @param {number} [levelFilter=3] - ログレベル enum MyLogger.LEVEL
     * @returns {string} - ログ文字列
     * @memberof MyLogger
     */
    public getLogs(levelFilter: number = 3): string {
        switch (this._logger.level) {
            case 'fatal': {
                levelFilter = 0;
                break;
            }
            case 'error': {
                levelFilter = 1;
                break;
            }
            case 'warn': {
                levelFilter = 2;
                break;
            }
            case 'info': {
                levelFilter = 3;
                break;
            }
            case 'debug': {
                levelFilter = 4;
                break;
            }
            case 'trace': {
                levelFilter = 5;
                break;
            }
            default: {
                levelFilter = 3;
            }
        }

        return (
            this._logs &&
            this._logs
                .reduce((acc: string[], logItem: LogItem) => {
                    if (logItem.level <= levelFilter) {
                        acc.push(logItem.log);
                    }
                    return acc;
                }, [])
                .join('\n')
        );
    }

    /**
     * メモリ格納中のログの消去
     */
    public clear() {
        this._logs = [];
    }
    /**
     * ログレベルの取得
     * @returns {string} - ログレベル文字列
     * @memberof MyLogger
     */
    public getLevel() {
        return this._logger.level;
    }
    /**
     * ログレベルの指定
     * @param {string} level - ログレベル文字列
     */
    public setLevel(level: string) {
        this.level = level;
        this._logger.level = level;
    }
    /**
     * ログの記録
     * @param {string} [message=''] - 記録する文字列
     * @param {number} [level=3] - ログレベル enum MyLogger.LEVEL
     * @memberof MyLogger
     */
    public log(message: string = '', level: number = 3) {
        const logLine = new LogItem(message, level);
        this._logs.push(logLine);
        if (level <= this._level) {
            //console.log(logLine.log);
        }
        ///*
        switch (level) {
            case 0:
                this._logger.fatal(message);
                break;
            case 1:
                this._logger.error(message);
                break;
            case 2:
                this._logger.warn(message);
                break;
            case 3:
                this._logger.info(message);
                break;
            case 4:
                this._logger.debug(message);
                break;
            case 5:
                this._logger.trace(message);
                break;
            default: {
                this._logger.info(message);
            }
        }
        //*/
    }
    /**
     * ログの記録
     * @param {string} message - String to Log
     */
    public fatal(message: string = '') {
        this.log(message, MyLogger.LEVEL.FATAL);
    }
    /**
     * ログの記録
     * @param {string} message - String to Log
     */
    public error(message: string = '') {
        this.log(message, MyLogger.LEVEL.ERROR);
    }
    /**
     * ログの記録
     * @param {string} message - String to Log
     */
    public warn(message: string = '') {
        this.log(message, MyLogger.LEVEL.WARN);
    }
    /**
     * ログの記録
     * @param {string} message - String to Log
     */
    public info(message: string = '') {
        this.log(message, MyLogger.LEVEL.INFO);
    }
    /**
     * ログの記録
     * @param {string} message - String to Log
     */
    public debug(message: string = '') {
        this.log(message, MyLogger.LEVEL.DEBUG);
    }
    /**
     * ログの記録
     * @param {string} message - String to Log
     */
    public trace(message: string = '') {
        this.log(message, MyLogger.LEVEL.TRACE);
    }
}
module MyLogger {
    export enum LEVEL {
        'FATAL', // 0
        'ERROR', // 1
        'WARN', // 2
        'INFO', // 3
        'DEBUG', // 4
        'TRACE', // 5
    }
}
export default MyLogger;
