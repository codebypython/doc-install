# Scribd-dl ![nodedotjs](https://img.shields.io/badge/node.js-v21.6-339933.svg?style=flat&logo=nodedotjs&logoColor=white) ![npm](https://img.shields.io/badge/npm-10.2-dc2c35.svg?style=flat&logo=npm&logoColor=white)  

<a href="https://buymeacoffee.com/r1y5i" target="_blank">
<img style="border-radius: 20px" src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="41" width="174">
</a>

## About ##
Scribd-dl helps downloading:
- documents on [scribd.com](https://www.scribd.com/) and [slideshare.net](https://www.slideshare.net/) without membership / sign-in  
- podcast audios on [everand.com](https://www.everand.com/podcasts)  
- documents on [studocu.com](https://www.studocu.com/) / [studeersnel.nl](https://www.studeersnel.nl/) when content is public, or when your own valid session cookie is provided  

## Prerequisites ##
To use Scridb-dl, you need to install [Node.js](https://nodejs.org/en/download/). It is recommended that you use the latest LTS version available.  

> Please install Node.js using pre-built installers for your platform. You may encounter incompatibility issues with different development tools otherwise.  

To check that Node.js was installed correctly, type the following commands in your terminal client:  
```console
node -v
npm -v
```
The commands should print the versions of Node.js and npm accordingly.  

## Setup ##
1. Download repository  
```console
git clone https://github.com/rkwyu/scribd-dl
```
2. Install dependencies
```console
cd ./scribd-dl
npm install
```

## Configuration ##
Configuration can be altered in `config.ini`.  
```ini
[SCRIBD]
rendertime=100

[STUDOCU]
rendertime=150

[DIRECTORY]
output=output
filename=title

[SESSION]
cookie_file=
```
| Config | Description | Support |
| --- | --- | --- |
| `rendertime` | waiting time in millisecond for single page rendering | [scribd.com](https://www.scribd.com/) |
| `STUDOCU.rendertime` | waiting time in millisecond while auto-scrolling Studocu viewer | [studocu.com](https://www.studocu.com/)<br/>[studeersnel.nl](https://www.studeersnel.nl/) |
| `output` | output directory | [scribd.com](https://www.scribd.com/)<br/>[slideshare.net](https://www.slideshare.net/)<br/>[everand.com](https://www.everand.com/podcasts) |
| `filename` | output filename<br/>`title`: filename = default filename / title<br/>(otherwise, filename = ID) | [scribd.com](https://www.scribd.com/)<br/>[slideshare.net](https://www.slideshare.net/) |
| `SESSION.cookie_file` | optional absolute path to your own exported browser cookies (JSON array format) | [studocu.com](https://www.studocu.com/)<br/>[studeersnel.nl](https://www.studeersnel.nl/) |

## Usage (CLI) ##
```console
Usage: npm start [options] url
Options:  
  /i        image-based: generated from page snapshots (scribd + studocu)
```

#### Example 1: Download 《The Minds of Billy Milligan》 on scribd.com ####
```console
npm start "https://www.scribd.com/doc/249398282/The-Minds-of-Billy-Milligan-Daniel-Keyes"
```

#### Example 2: Download 《The Minds of Billy Milligan》 using `image-based` method on scribd.com ####
```console
npm start /i "https://www.scribd.com/doc/249398282/The-Minds-of-Billy-Milligan-Daniel-Keyes"
```

#### Example 3: Download 《Everything You Need To Know About ChatGPT》 on slideshare.net ####
```console
npm start "https://www.slideshare.net/slideshow/everything-you-need-to-know-about-chatgpt-8ba3/266783915"
```

#### Example 4: Download all 《TED Talks Daily》 episodes on everand.com ####
```console
npm start "https://www.everand.com/podcast-show/414106971/TED-Talks-Daily"
```

#### Example 5: Download 《Sunday Pick: How to care for the people who take care of us (w/ Ai-jen Poo)》 on everand.com ####
```console
npm start "https://www.everand.com/listen/podcast/731670963"
```

#### Example 6: Download a public Studocu document ####
```console
npm start "https://www.studocu.com/vn/document/example/example-course/example-document/12345678"
```

#### Example 7: Download a Studocu document in image-based mode ####
```console
npm start /i "https://www.studocu.com/vn/document/example/example-course/example-document/12345678"
```

## Studocu Session (Optional) ##
For documents you can legally access in your own account, you can provide your own cookies:
1. Export cookies from your signed-in browser session (JSON array format).
2. Set `SESSION.cookie_file` in `config.ini` to that absolute path.
3. Run the same CLI commands as above.

If no cookie file is configured, the tool only processes publicly visible content.

## Support URL Format ##
- https://www.scribd.com/doc/**
- https://www.scribd.com/embeds/**
- https://www.slideshare.net/**
- https://www.slideshare.net/slideshow/**
- https://www.everand.com/podcast-show/**
- https://www.everand.com/podcast/**
- https://www.everand.com/listen/podcast/**
- https://www.studocu.com/**
- https://www.studeersnel.nl/**

## Development Plan ##

- Scribd obfuscates the .pdf files, the texts copied from the documents might become strange garbled message. De-obfuscating is one of the future plan.

## License ##
This project is licensed under the [MIT License](LICENSE.md)
