
<h1 align="center">enhance-res</h1>
<div align="center">
  <strong>Enhance http.ServerResponse object</strong>
</div>
<br>
<div align="center">
  <a href="https://npmjs.org/package/enhance-res">
    <img src="https://img.shields.io/npm/v/enhance-res.svg?style=flat-square" alt="npm package version" />
  </a>
  <a href="https://npmjs.org/package/enhance-res">
  <img src="https://img.shields.io/npm/dm/enhance-res.svg?style=flat-square" alt="npm downloads" />
  </a>
  <a href="https://github.com/feross/standard">
    <img src="https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square" alt="standard JS linter" />
  </a>
  <a href="https://github.com/prettier/prettier">
    <img src="https://img.shields.io/badge/styled_with-prettier-ff69b4.svg?style=flat-square" alt="prettier code formatting" />
  </a>
  <a href="https://travis-ci.org/tiaanduplessis/enhance-res">
    <img src="https://img.shields.io/travis/tiaanduplessis/enhance-res.svg?style=flat-square" alt="travis ci build status" />
  </a>
  <a href="https://github.com/tiaanduplessis/enhance-res/blob/master/LICENSE">
    <img src="https://img.shields.io/npm/l/enhance-res.svg?style=flat-square" alt="project license" />
  </a>
  <a href="http://makeapullrequest.com">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square" alt="make a pull request" />
  </a>
</div>
<br>
<div align="center">
  <a href="https://github.com/tiaanduplessis/enhance-res/watchers">
    <img src="https://img.shields.io/github/watchers/tiaanduplessis/enhance-res.svg?style=social" alt="Github Watch Badge" />
  </a>
  <a href="https://github.com/tiaanduplessis/enhance-res/stargazers">
    <img src="https://img.shields.io/github/stars/tiaanduplessis/enhance-res.svg?style=social" alt="Github Star Badge" />
  </a>
  <a href="https://twitter.com/intent/tweet?text=Check%20out%20enhance-res!%20https://github.com/tiaanduplessis/enhance-res%20%F0%9F%91%8D">
    <img src="https://img.shields.io/twitter/url/https/github.com/tiaanduplessis/enhance-res.svg?style=social" alt="Tweet" />
  </a>
</div>
<br>
<div align="center">
  Built with ❤︎ by <a href="https://github.com/tiaanduplessis">tiaanduplessis</a> and <a href="https://github.com/tiaanduplessis/enhance-res/contributors">contributors</a>
</div>

<h2>Table of Contents</h2>
<details>
  <summary>Table of Contents</summary>
  <li><a href="#install">Install</a></li>
  <li><a href="#usage">Usage</a></li>
  <li><a href="#contribute">Contribute</a></li>
  <li><a href="#license">License</a></li>
</details>

## Install

[![Greenkeeper badge](https://badges.greenkeeper.io/tiaanduplessis/enhance-res.svg)](https://greenkeeper.io/)

```sh
$ npm install enhance-res
# OR
$ yarn add enhance-res
```

## Usage

```js
const http = require('http')
const enhanceRes = require('enhance-res')

http.createServer((req, res) => {
  enhanceRes(res)
  res.send({test: true})
  // res.send(new Buffer('Test'))
  // res.error(new Error('Oops'))
  // res.status(201).send({test: true})
  // res.redirect('http://google.com)
  // res.html('<h1>Hi</h1>)
}).listen(5000)

```

## Contributing

Contributions are welcome!

1. Fork it.
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

Or open up [a issue](https://github.com/tiaanduplessis/enhance-res/issues).

## License

Licensed under the MIT License.
