
const HtmlWebpackPlugin = require("html-webpack-plugin"); //通过 npm 安装
const path = require("path")
const uglify = require('uglifyjs-webpack-plugin');//js压缩
const MiniCssExtractPlugin = require("mini-css-extract-plugin");//分离CSS
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const cdnDir = path.resolve(__dirname, '../../../', 'imgcache.gtimg.cn/vip/');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');


module.exports = {
    mode: 'development',
    //入口文件的配置项  modelDecalPoint
    entry: {
        index: ['./src/views/index/index.js'],
        plugins: [
            'three'
        ]
    },
    //出口文件的配置项
    output: {
        //打包路径
        path: path.resolve(__dirname, '../dist'),
        //打包的文件名称
        filename: './js/[name]-[hash].js',
    },
    //生成通用模块
    optimization: {
        splitChunks: {
            cacheGroups: {
                commons: {
                    name: "plugins",
                    chunks: "initial",
                    minChunks: 2
                }
            }
        }
    },
    //模块：例如解读CSS,图片如何转换、压缩
    module: {
        rules: [
            //MIME
            {
                test: /\.(otf|eot|svg|ttf|woff|woff2)$/,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            name: 'assets/font/[hash:16].[ext]',// 打包后的文件名称
                            outputPath: '', // 默认是dist目录
                            useRelativePath: false, // 使用相对路径
                            limit: 1 // 表示小于1K的图片会被转化成base64格式
                        }
                    }
                ]
            },
            {
                test: /\.(fbx|ply|gltf|bin|glb|obj|mtl|hdr)$/,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            name: 'assets/models/[ext]/[hash:16].[ext]',
                        }
                    }
                ]
            },
            //css loader
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    "css-loader"
                ]
            },
            //图片 loader
            {
                test: /\.(png|jpg|gif|jpeg)/,  //是匹配图片文件后缀名称
                use: [{
                    loader: 'url-loader', //是指定使用的loader和loader的配置参数
                    options: {
                        limit: 1,  //是把小于500B的文件打成Base64的格式，写入JS
                        name: 'assets/img/[hash:16].js',
                        outputPath: '',// 指定打包后的图片位置
                    }
                }]
            },

            //img标签
            {
                test: /\.(htm|html)$/i,
                use: ['html-withimg-loader']
            },
        ]
    },
    //插件，用于生产模版和各项功能
    plugins: [
        new CopyWebpackPlugin([
            {
                from: path.resolve(__dirname, '../src/public'),
                to: '../dist/public',
            }
        ]),
        new webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery',
            "window.jQuery": "jquery"
        }),//allGeometry

        new HtmlWebpackPlugin({
            minify: { //是对html文件进行压缩
                collapseWhitespace: true,//压缩空白
                removeAttributeQuotes: true  //removeAttrubuteQuotes是去掉属性的双引号。
            },
            filename: 'index.html',//生成的html页面的名称
            hash: true, //为了开发中js有缓存效果，所以加入hash，这样可以有效避免缓存JS。
            template: './src/views/index/index.html', //是要打包的html模版路径和文件名称。
            chunks: ['index']
        }),

        //压缩CSS
        new MiniCssExtractPlugin({
            filename: "css/[name]-[hash:8].css",
            chunkFilename: "css/[id].css"
        }),
        //设置每一次build之前先删除dist     
        new CleanWebpackPlugin(),
    ],
    //配置webpack开发服务功能
    devServer: {
        //设置基本目录结构
        contentBase: './dist',
        //服务器的IP地址，可以使用IP也可以使用LOCALHOST
        host: 'localhost',
        //服务端压缩是否开启
        //compress: true,
        //配置服务端口号
        port: 8888,
        inline: true,//文件更新时会自动更新
        progress: false,
        open: true, // 开启浏览器
        hot: true   // 开启热更新
        //hotOnly:true
    }
}