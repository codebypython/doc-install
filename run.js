import { app } from './src/App.js'
import * as scribdFlag  from './src/const/ScribdFlag.js'
import * as studocuFlag from './src/const/StudocuFlag.js'

const flags = [
    scribdFlag.DEFAULT,
    scribdFlag.IMAGE,
    studocuFlag.DEFAULT,
    studocuFlag.IMAGE,
]

if (process.argv.length >= 3) {
    let url;
    let flag;
    for (let i = 2; i < process.argv.length; i++) {
        if (flags.includes(process.argv[i])) {
            flag = process.argv[i]
        } else {
            url = process.argv[i]
        }
    }
    await app.execute(url, flag)
} else {
    console.error(`
Usage: npm start [options] url
Options:  
  /i        image-based mode for scribd.com or studocu.com
    `)
}