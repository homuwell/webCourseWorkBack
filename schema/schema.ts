const graphql = require('graphql');
const Users = require('../models/Users');
const Categories = require('../models/Categories');
const Products = require('../models/Products')
const Basket = require('../models/Basket')
const Orders = require('../models/Orders');
const sha256 = require('js-sha256');
const jwt = require('jwt-then');
const GraphQLDate = require('graphql-date');
const {GraphQLObjectType, GraphQLString, GraphQLSchema, GraphQLID, GraphQLBoolean, GraphQLInt, GraphQLList, GraphQLInputObjectType} = graphql;
const { GraphQLUpload } = require('graphql-upload');
const fs = require('fs');


const UserType = new GraphQLObjectType({
    name: 'User',
    fields: () => ({
        id: {type: GraphQLString},
        login: {type: GraphQLString},
        type: {type: GraphQLBoolean},
        name: {type: GraphQLString},
        surname: {type: GraphQLString},
        email: {type: GraphQLString},
        phoneNumber: {type: GraphQLString},
        password: {type: GraphQLString},
        token: {type: GraphQLString}
    }),
})

const InputProductsType = new GraphQLInputObjectType({
    name: 'InputProductsType',
    fields: () => ({
        productName: {type: GraphQLString},
        quantity: {type: GraphQLInt},
        cost: {type:GraphQLInt}
    })
})

const ProductType = new GraphQLObjectType({
    name: 'Product',
    fields: () => ({
        _id: {type: GraphQLString},
        name: {type: GraphQLString},
        category: {type: GraphQLString},
        description: {type: GraphQLString},
        image: {type: GraphQLString},
        cost: {type: GraphQLInt},
        quantity: {type: GraphQLInt},
    })
})

const CategoryType = new GraphQLObjectType( {
    name: 'Category',
    fields: () => ({
        id: {type: GraphQLString},
        name: {type: GraphQLString}
    })
})

const ProductInBasketType = new GraphQLObjectType({
    name: 'ProductInBasket',
    fields: () => ({
        productName: {type: GraphQLString},
        quantity: {type: GraphQLInt},
        cost: {type:GraphQLInt}
    })
})


const OrdersType = new GraphQLObjectType( {
    name: 'Orders',
    fields: () => ({
        _id: {type: GraphQLString},
        userId: {type: GraphQLString},
        date: {type: GraphQLDate},
        cost: {type: GraphQLInt},
        products: {type: new GraphQLList(ProductInBasketType)}
    })
})
const BasketType = new GraphQLObjectType({
    name: 'Basket',
    fields: () => ({
        UserId: {type: GraphQLString},
        token: {type:GraphQLString},
        products: {type: new GraphQLList(ProductInBasketType)}
    })
})

const Query = new GraphQLObjectType({
    name: 'Query',
    fields: {
        user: {
            type: UserType,
            args: {id: {type: GraphQLID} },
            resolve(parent,args) {
                Users.find(args.id);
            }
        },
        authenticateUser: {
            type: UserType,
            args: {token: {type: GraphQLString} },
            async resolve(parent, args) {
                if (!args.token) {
                    throw Error('Необходимо войти в систему для получения доступа');
                }
                const payload = await jwt.verify(args.token, process.env.SECRET);
                return  {id: payload.id};
            }
        },
        getUserData: {
            type: UserType,
            args: {token: {type: GraphQLString} },
            async resolve(parent, args) {
                if (!args.token) {
                    throw Error('Необходимо войти в систему для получения доступа');
                }
                const payload = await jwt.verify(args.token, process.env.SECRET);
                const UserData = await Users.findOne({"_id": payload.id },{password: 0} );
                return UserData;
            }
        },
        getProducts: {
            type: new GraphQLList(ProductType),
            args: {category: {type: GraphQLString}},
            async resolve(parent, args) {
                if (args.category === undefined) {
                    const products = await Products.find({});
                    return products;
                } else {
                    const products = await Products.find({"category": args.category})
                    return products;
                }
            }
        },
        getProduct: {
            type: ProductType,
            args: {id: {type:GraphQLString}},
            async resolve(parent, args) {
                const ExistingProduct = await Products.findOne({'_id': args.id})
                if (!ExistingProduct) {
                    return new Error('Такого продукта не существует');
                }
                const categoryName = await Categories.findOne({'_id': ExistingProduct.category});
                return {
                    name: ExistingProduct.name,
                    category: categoryName.name,
                    description: ExistingProduct.description,
                    cost: ExistingProduct.cost,
                    quantity: ExistingProduct.quantity,
                    image: ExistingProduct.image
                }
            }
        },
        getProductByName: {
            type: ProductType,
            args: {
                name: {type: GraphQLString}
            },
            async resolve(parent, args) {
                const ExistingProduct = await Products.findOne({'name': args.name})
                if (!ExistingProduct) {
                    return new Error('Такого продукта не существует');
                }
                const categoryName = await Categories.findOne({'_id': ExistingProduct.category});
                return {
                    _id: ExistingProduct.id,
                    name: ExistingProduct.name,
                    category: categoryName.name,
                    description: ExistingProduct.description,
                    cost: ExistingProduct.cost,
                    quantity: ExistingProduct.quantity,
                    image: ExistingProduct.image
                }
            }
        },
        getUserBasket: {
            type: BasketType,
            args: {token: {type: GraphQLString}},
            async resolve(parent, args) {
                const payload =  await jwt.verify(args.token, process.env.SECRET);
                const userBasket = await Basket.findOne({"userId": payload.id});
                return userBasket;
            }

        },
        getCategories: {
            type: new GraphQLList(CategoryType),
            async resolve(parent,args) {
                return Categories.find({});
            }
        },
        getUserOrders: {
            type: new GraphQLList(OrdersType),
            args: {token: {type: GraphQLString}},
            async resolve(parent, args) {
                const payload =  await jwt.verify(args.token, process.env.SECRET);
                const userOrders = await Orders.find({"userId": payload.id});
                return userOrders;
}
        }
    },
})

const Mutation = new GraphQLObjectType({
    name: 'Mutation',
    fields: {
        createUser: {
            type: UserType,
            args: {
                login: {type: GraphQLString},
                name: {type: GraphQLString},
                surname: {type: GraphQLString},
                email: {type: GraphQLString},
                phoneNumber: {type: GraphQLString},
                password: {type: GraphQLString}
            },
            async resolve(parent, args) {
                for (let key in args) {
                    if (args[key] === '') {
                        throw new Error('Не все поля заполнены');

                    }
                }
                const existingLogin = await Users.findOne({"login": args.login});
                if (existingLogin) {
                    throw new Error('Пользователь с этим логином уже существует');
                }
                const existingEmail = await Users.findOne({"email": args.email});
                if (existingEmail) {
                    throw new Error('Пользователь с этим электронным адрессом уже существует');

                }
                const existingPhoneNumber = await Users.findOne({"phoneNumber": args.phoneNumber});
                if (existingPhoneNumber) {
                    throw new Error('Пользователь с таким номером телефона уже существует');
                }
                const user = new Users({
                    login: args.login,
                    type: 0,
                    name: args.name,
                    surname: args.surname,
                    email: args.email,
                    phoneNumber: args.phoneNumber,
                    password: await sha256(args.password + process.env.SALT)
                });
                await user.save();
            }
        },
        LoginUser: {
            type: UserType,
            args: {
                login: {type: GraphQLString},
                password: {type: GraphQLString}
            },
            async resolve(parent, args) {
                const ExistingUser = await Users.findOne({'login': args.login});
                if (!ExistingUser) {
                    throw new Error('Такого пользователя не существует');
                }
                const CheckPassword = await sha256(args.password + process.env.SALT);
                if (ExistingUser.password !== CheckPassword) {
                    throw new Error('Неверный пароль');
                }
                return {
                    token: await jwt.sign({id: ExistingUser.id}, process.env.SECRET),
                    login: ExistingUser.login
                };
            }
        },
        addCategory: {
            type: CategoryType,
            args: {
                name: {type: GraphQLString}
            },
            async resolve(parent, args) {
                const ExistingCategory = await Users.findOne({'name': args.name});
                if (ExistingCategory) {
                    throw new Error('Такая категория уже существует');
                }
                const Category = new Categories({
                    name: args.name
                })
                await Category.save();
            }
        },
        addProduct: {
            type: ProductType,
            args: {
                name: {type: GraphQLString},
                category: {type: GraphQLString},
                description: {type: GraphQLString},
                cost: {type: GraphQLInt},
                quantity: {type: GraphQLInt},
                image: {type: GraphQLUpload}
            },
            async resolve(parent, args) {
                const {filename, mimetype, createReadStream} = await args.image;

                for (let key in args) {
                    if (args[key] === '') {
                        throw new Error('Не все поля заполнены');
                    }
                }
                const ExistingName = await Products.findOne({"name": args.name})
                if (ExistingName) {
                    throw new Error('Продукт с таким именем уже существует');
                }
                const ExistingCategory = await Categories.findOne({"name": args.category});
                if (!ExistingCategory) {
                    throw new Error('Такой категории не существует');
                }
                if (args.cost <= 0) {
                    throw new Error('Цена должна быть больше 0');
                }
                if (args.quantity < 0) {
                    throw new Error('Количество товара не может быть отрицательным');
                }
                const stream = createReadStream();
                const uploadDir = './uploads';
                const path = `${uploadDir}/${filename}`;
                await new Promise((resolve, reject) =>
                    stream
                        .on('error', error => {
                            if (stream.truncated)
                                // delete the truncated file
                                fs.unlinkSync(path);
                            reject(error);
                        })
                        .pipe(fs.createWriteStream(path))
                        .on('error', error => reject(error))
                        .on('finish', () => resolve({path}))
                );
                const product = new Products({
                    name: args.name,
                    category: ExistingCategory._id,
                    description: args.description,
                    cost: args.cost,
                    quantity: args.quantity,
                    image: path.substr(1)
                });
                await product.save();
            }
        },
        addToBasket: {
            type: BasketType,
            args: {
                token: {type: GraphQLString},
                productId: {type: GraphQLString},
            },
            async resolve(parent, args) {
                const payload = await jwt.verify(args.token, process.env.SECRET);
                const ExistingBasket = await Basket.findOne({"userId": payload.id});
                const ExistingUser = await Users.findOne({"_id": payload.id});
                const ExistingProduct = await Products.findOne({"_id": args.productId});
                const ExistingProductInBasket = await Basket.findOne({"products.productName": ExistingProduct.name});
                console.log(ExistingProduct);
                console.log(ExistingProductInBasket);
                if (ExistingProductInBasket) {
                    return new Error('Такой товар уже добавлен в корзину');
                }
                if (!ExistingUser) {
                    return new Error('Такого пользователя не существует');
                }
                if (ExistingProduct.quantity - 1 < 0) {
                    return new Error('На складе недостаточно товара');
                }
                if (ExistingBasket) {
                    await ExistingBasket.updateOne({
                        $push: {
                            "products": {
                                productName: ExistingProduct.name,
                                quantity: 1,
                                cost: ExistingProduct.cost
                            }
                        }
                    });
                } else {
                    const basket = new Basket({
                        userId: payload.id,
                        products: {productName: ExistingProduct.name, quantity: 1, cost: ExistingProduct.cost}
                    });
                    await basket.save();
                }
                return {ProductName: true}
            }
        },
        changeQuantity: {
            type: BasketType,
            args: {
                productName: {type: GraphQLString},
                quantity: {type: GraphQLInt},
                token: {type: GraphQLString}
            },
            async resolve(parent, args) {
                const payload = await jwt.verify(args.token, process.env.SECRET);
                const findUserInBasket = await Basket.findOne({"userId": payload.id});
                const findProductInBasket = await Basket.findOne({"products.productName": args.productName})
                const product = await Products.findOne({"name": args.productName});
                if (!findUserInBasket) {
                    return new Error('У этого пользователя нет корзины');
                }
                if (!findProductInBasket) {
                    return new Error('В корзине нет такого товара');
                }
                if (args.quantity > product.quantity) {
                    return new Error('На складе нет такого колличества товара');
                }
                if (args.quantity < 1) {
                    return new Error('Недопустимое число');
                }
                await Basket.findOneAndUpdate({"userId": payload.id, "products.productName": args.productName}, {
                    $set: {
                        'products.$.quantity': args.quantity
                    }
                }, {
                    new: true
                });

            }
        },
        deleteProduct: {
            type: BasketType,
            args: {
                productName: {type: GraphQLString},
                token: {type: GraphQLString},
            },
            async resolve(parent, args) {
                const payload = await jwt.verify(args.token, process.env.SECRET);
                const findUserInBasket = await Basket.findOne({"userId": payload.id});
                const findProductInBasket = await Basket.findOne({"products.productName": args.productName});
                if (!findUserInBasket) {
                    return new Error('У этого пользователя нет корзины');
                }
                if (!findProductInBasket) {
                    return new Error('В корзине нет такого товара');
                }
                await Basket.findOneAndUpdate({"userId": payload.id}, {
                    "$pull": {
                        "products": {
                            "productName": args.productName
                        }
                    }
                }, {
                    multi: true
                });
            }
        },
        delProduct: {
            type: ProductType,
            args: {
                name: {type: GraphQLString}
            },
            async resolve(parent, args) {
                const ExistingProduct = await Products.findOne({"name": args.name});
                if (!ExistingProduct) {
                    throw new Error('Такого товара не существует');
                } else {
                    ExistingProduct.delete();
                }
            }
        },
        changeProduct: {
            type: ProductType,
            args: {
                id: {type: GraphQLString},
                name: {type: GraphQLString},
                category: {type: GraphQLString},
                description: {type: GraphQLString},
                cost: {type: GraphQLInt},
                quantity: {type: GraphQLInt},
                image: {type: GraphQLUpload}
            },
            async resolve(parent, args) {
                const ExistingProduct = await Products.findOne({"_id":args.id});
                const ExistingCategory = await Categories.findOne({"name":args.category});
                if (!ExistingProduct) {
                    throw new Error('Такого продукта не существует');
                }
                if (!ExistingCategory) {
                    throw new Error('Такой категории не существует');
                }
                if(args.name !== ExistingProduct.name) {
                    ExistingProduct.name = args.name;
                }
                if(ExistingCategory._id !== ExistingProduct.category) {
                    ExistingProduct.category = ExistingCategory._id;
                }
                if(args.description !== ExistingProduct.description) {
                    ExistingProduct.description = args.description;
                }
                if(args.cost !== ExistingProduct.cost) {
                    ExistingProduct.cost = args.cost;
                }
                if(args.quantity !== ExistingProduct.quantity) {
                    ExistingProduct.quantity = args.quantity;
                }
                if(args.image !== null) {
                    //fs.unlink(__dirname + ExistingProduct.image)
                    const {filename, mimetype, createReadStream} = await args.image;
                    const stream = createReadStream();
                    const uploadDir = './uploads';
                    const path = `${uploadDir}/${filename}`;
                    await new Promise((resolve, reject) =>
                        stream
                            .on('error', error => {
                                if (stream.truncated)
                                    // delete the truncated file
                                    fs.unlinkSync(path);
                                reject(error);
                            })
                            .pipe(fs.createWriteStream(path))
                            .on('error', error => reject(error))
                            .on('finish', () => resolve({path}))
                    );
                    ExistingProduct.image = path.substr(1);
                }
                await ExistingProduct.save();
            }
        },
        addToOrders: {
            type: OrdersType,
            args: {
                token: {type: GraphQLString},
                cost: {type: GraphQLInt},
                products: {type: new GraphQLList(InputProductsType)}
            },
            async resolve(parent, args) {
                const payload = await jwt.verify(args.token, process.env.SECRET);
                const order = new Orders({
                    userId: payload.id,
                    cost: args.cost,
                    products: args.products,
                })
                await order.save();
                await Basket.findOneAndRemove({userId: payload.id});
            }
        }
    }
})

module.exports = new GraphQLSchema ({
    query: Query,
    mutation: Mutation,
});