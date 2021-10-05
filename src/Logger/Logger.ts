import {ILogger} from "../@types/Logger/ILogger"

/**
 * Logger class
 * @implements {ILogger}
 */
class Logger implements ILogger {
	/**
	 * This function just returns date&time
	 * @private
	 * @return string Date().toLocaleString()
	 */
	private static getTime(): string {
		return new Date().toLocaleString()
	}

	/**
	 * Main logger functions. Log messages in format [date, time]: <message>
	 * @param messages - sequence of messages
	 */
	public log<T>(...messages: T[]): void {
		console.log(`[${Logger.getTime()}]: ${messages.join(" ")}`) // eslint-disable-line no-console
	}
}

export default Logger
