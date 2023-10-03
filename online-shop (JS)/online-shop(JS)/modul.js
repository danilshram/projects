function createStore(reducer){
    let state       = reducer(undefined, {}) //стартовая инициализация состояния, запуск редьюсера со state === undefined
    let cbs         = []                     //массив подписчиков
    
    const getState  = () => state            //функция, возвращающая переменную из замыкания
    const subscribe = cb => (cbs.push(cb),   //запоминаем подписчиков в массиве
                             () => cbs = cbs.filter(c => c !== cb)) //возвращаем функцию unsubscribe, которая удаляет подписчика из списка   
    const dispatch  = action => { 
        if (typeof action === 'function'){ //если action - не объект, а функция
            return action(dispatch, getState) //запускаем эту функцию и даем ей dispatch и getState для работы
        }
        const newState = reducer(state, action) //пробуем запустить редьюсер
        if (newState !== state){ //проверяем, смог ли редьюсер обработать action
            state = newState //если смог, то обновляем state 
            for (let cb of cbs)  cb(state) //и запускаем подписчиков
        }
    }
    return {
        getState, //добавление функции getState в результирующий объект
        dispatch,
        subscribe //добавление subscribe в объект
    }
}

// REDUCERS і створення початкового стану
function combineReducers(reducers){
    function totalReducer(state={}, action){
        const newTotalState = {}
        for (const [reducerName, reducer] of Object.entries(reducers)){
            const newSubState = reducer(state[reducerName], action)
            if (newSubState !== state[reducerName]){
                newTotalState[reducerName] = newSubState
            }
        }
        if (Object.keys(newTotalState).length){
            return {...state, ...newTotalState}
        }
        return state
    }
    return totalReducer
}

function promiseReducer(state={},  {name, type, status, payload, error}){
    if (type === 'PROMISE'){
        return{
            ...state,   
            [name] : {status, payload, error}
        }
    }
    return state
}

function authReducer(state={}, {type, token}){
    if(type === "AUTH_LOGOUT"){
        return {}
    }
    if(type === "AUTH_LOGIN"){
        let payload = jwtDecode(token)
        if(payload){
            return {token, payload}
        }
    }
    return state
}
function cartReducer(state = {}, {type, count, good}){
    if (type === 'CART_ADD') {
        const id = good._id   
        if (state[id]) {
          return {
            ...state,
            [id]: {
              ...state[id],
              count: state[id].count + count,
              good
            }
          };
        } else {
          return {
            ...state,
            [id]: {
              count,
              good
            }
          };
        }
    }
    if(type === 'CART_SUB'){ 
        const id = good._id 
        if(state[id].count <= 0){
            let newState = {...state}
            delete newState[id]
            return newState
        }
        if(state[id]){
            return {
                ...state,
                [id]: {
                    ...state[id],
                    count: state[id].count - count,
                    good
                }
            }
        }
    }
    if(type === 'CART_DEL'){
        const id = good._id 
        let newState = {...state}
        delete newState[id]
        return newState
    }
    if(type === 'CART_SET'){
        const id = good._id 
        if(state[id].count <= 0){
            let newState = {...state}
            delete newState[id]
            return newState
        }
        if(state[id]){
            return{
                ...state,
                [id]: {
                    ...state[id],
                    count: state[id].count + count,
                    good
                }
            }
        }else{
            return {
                ...state,
                [id]:{
                    count,
                    good
                }
            }
        }  
    }
    if(type === 'CART_CLEAR'){
        return {}
    }
    return state
}
//Допоміжні функціі
function jwtDecode(token){ 
    try{
        let tokenParts = token.split('.')
        let tokenSecondPart = tokenParts[1]
        let tokenJSON = atob(tokenSecondPart)
        let normalToken = JSON.parse(tokenJSON)
        return normalToken
    }
    catch(e){ 
    }
}
function getGql(adress){
    return function gql(query, variables ={}){
        return new Promise((resolve, rejected) =>{
            const headers = {}
            const token = store.getState().auth.token
            if(token){
                headers['Authorization'] = `Bearer ${token}`
            }
            fetch(adress, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json", 
                    ...headers
                },
                body: JSON.stringify({ query, variables }),
                    }).then(res => res.json())
                    .then(json => {
                    if(json.errors){
                        throw new Error(json.errors.message)
                    }
                    let data = json.data
                    let keys = Object.keys(data)
                    let result = data[keys[0]]
                    resolve(result)
                })
                .catch(e =>{
                    rejected(e)
                })
                })
        }
}
function localStoredReducer(originalReducer, localStorageKey){
    function wrapper(state, action){
        if(typeof state === 'undefined'){
            // debugger;
            let key = localStorage[localStorageKey]
            try{
                return JSON.parse(key)
            }
            catch(e){}
        }
        let newState = originalReducer(state,action)
        localStorage.setItem(localStorageKey, JSON.stringify(newState))
        return newState
    }
    return wrapper
}
const reducers = {
    promise: promiseReducer, //допилить много имен для многих промисо
    auth: localStoredReducer(authReducer, 'auth'),     //часть предыдущего ДЗ
    cart: localStoredReducer(cartReducer, 'cart')    //часть предыдущего ДЗ
}
const totalReducer = combineReducers(reducers)
let store = createStore(totalReducer)
store.subscribe(() => console.log(store.getState()))

 
let adress = 'http://shop-roles.node.ed.asmer.org.ua/graphql'
let gql = getGql(adress)

// GQL запити
const gqlLogin = (login,password) =>{
    return gql(`query login($login:String, $password:String){
        login(login:$login, password:$password)
    }`, {login, password}
    )
}
gqlLogin()
const gqlRootCats = () => 
    gql(`query rootCats { 
            CategoryFind(query:"[{\\"parent\\": null}]"){
             _id name
           }
}`)

const gqlCatById = (_id) =>{
    console.log(_id, "name")
    return gql(`query catById($q: String){
        CategoryFindOne(query: $q){
          name parent {_id name} 
              subCategories{_id name}
              goods{_id name price images{url}}
        }
      }`, 
      {q : JSON.stringify([{_id}])}
      )
}

const gqlGoodById = (_id) =>{
    return gql(`query goodById($q: String){
        GoodFindOne(query: $q){ 
          _id name description price
          images{url}
        }
      }`,
      {q : JSON.stringify([{_id}])}
      )
}

const gqlUserRegister = (login,password) =>{
    return gql(`mutation register($login:String, $password: String){
        UserUpsert(user: {login:$login, password: $password}){
          login
        }
      }`, {login,password}
    )
}
const gqlOrderFind = () =>{
    return gql(`query historyOrders {
        OrderFind(query: "[{}]") {
          orderGoods { price total count good{name}}
            owner {
              login
            }
          }
        }`
    )
}
const gqlOrderUpsert = (order) => {
    return gql(`mutation myOrder($order: OrderInput){
        OrderUpsert(order:$order){
          _id
        }
      }`,{order}
    )
}
// Екшени для логіну і реєстраціі і оформлення замовлення
const actionCartAdd = (good, count=1) => ({type: 'CART_ADD', count, good})
const actionCartSub = (good, count=1) => ({type: 'CART_SUB', count, good})
const actionCartDel = (good) => ({type: 'CART_DEL', good})
const actionCartSet = (good, count=1) => ({type: 'CART_SET', count, good})
const actionCartClear = () => ({type: 'CART_CLEAR'})
const actionAuthLogin  = token => ({type: 'AUTH_LOGIN', token})
const actionAuthLogout = ()    => ({type: 'AUTH_LOGOUT'})
const actionFullLogin = (login, password) =>
    async dispatch => {
        let token = await dispatch(actionPromise("gqlLogin", gqlLogin(login,password)))
        if(jwtDecode(token)){
            dispatch(actionAuthLogin(token))
        }
}
// const actionRegisterUser = (login,password) => actionPromise('registerUser', gqlUserRegister(login,password)) 
const actionFullRegister = (login, password) =>
    async dispatch => {
        let registerInfo = await dispatch(actionPromise('registerUser', gqlUserRegister(login,password)))
        if(registerInfo){
            dispatch(actionFullLogin(login, password))
        }
}
const actionMakeOrder = () =>
    async (dispatch, getState) => {
        let orderGoods = []
        for(let key in getState().cart){
            const {count, good} = getState().cart[key]
            const {_id} = good
            let order = {count, good:{_id}}
            orderGoods.push(order)     
        }
        let orderInfo = {orderGoods}
        if(await dispatch(actionPromise('makeOrder', gqlOrderUpsert(orderInfo)))){
            dispatch(actionCartClear())
            main.innerHTML = ""
        }
}

//Екшени для промісів
const actionPromise = (name, promise) =>
    async dispatch => { 
        dispatch(actionPending(name)) //сигнализируем redux, что промис начался
        try{
            const payload = await promise //ожидаем промиса
            dispatch(actionFulfilled(name, payload)) //сигнализируем redux, что промис успешно выполнен
            return payload //в месте запуска store.dispatch с этим thunk можно так же получить результат промиса
        }
        catch (error){
            dispatch(actionRejected(name, error)) //в случае ошибки - сигнализируем redux, что промис несложился
        }
}
const actionPending   = (name)      => ({name, type: 'PROMISE', status: 'PENDING'})
const actionFulfilled = (name, payload) => ({name, type: 'PROMISE', status: 'FULFILLED', payload})
const actionRejected  = (name, error)   => ({name, type: 'PROMISE', status: 'REJECTED',  error})
// Екшени до запитів 
const actionOrderHistory = () => actionPromise('history', gqlOrderFind())
const actionRootCats = () => actionPromise('rootCats', gqlRootCats())
store.dispatch(actionRootCats())
const actionCatById = (_id) => actionPromise('catById', gqlCatById(_id)) 
const actionGoodById = (_id) => actionPromise('goodFindOne', gqlGoodById(_id))
// SUBSCRIBES для відображення
store.subscribe(() => {
    cartIcon.innerHTML = `<a href="#/cart/"><img src = shopping-cart-icon.png></a>`
})
store.subscribe(() => {
    let history = document.getElementById('history')
    history.innerHTML = `<a href="#/history/">ORDER HISTORY</a>`
    const [,route] = location.hash.split('/')
    if (route !== 'history') return
    const{status, payload, error} = store.getState().promise.history
    if(status === 'FULFILLED' && payload){
        main.innerHTML = ""
        let table = document.createElement('table')
        let orderIndex = 1
        for(const orderGoods of payload){ 
            if(orderGoods.orderGoods.length === 0){
                continue
            }
            let trOrder = document.createElement('tr')
            let tdOrder = document.createElement('td')
            tdOrder.innerText = 'order' + " " + orderIndex++
            trOrder.append(tdOrder)
            table.append(trOrder)
            orderGoods.orderGoods.map(keys => {  
                let header = document.createElement('tr')
                table.style = 'border: 1px solid black, width: 100px'
                let headerTr = document.createElement('tr')
                header.style = 'border: 1px solid black'
                headerTr.style = 'border: 1px solid black'
                let headerInfo = Object.keys(keys)
                headerInfo.forEach(element =>{
                    let thHeader = document.createElement('th')
                    thHeader.style = 'border: 1px solid black'
                    thHeader.innerText = element
                    headerTr.append(thHeader)
                })
                table.append(headerTr)
                table.append(header)
                let tableInfo = Object.values(keys)
                let tr = document.createElement('tr')
                tr.style = 'border: 1px solid black'
                tableInfo.forEach(element => {
                    let td = document.createElement('td')
                    td.style = 'border: 1px solid black'
                    if(typeof element === 'object'){
                        const{name} = element
                        td.innerText = name
                    }else{
                        td.innerText = element
                    }
                    tr.append(td)
                    table.append(tr)
                })
            })
            main.append(table)
        }
    }
})
store.subscribe(() => {
    const {status, payload, error} = store.getState().promise.rootCats
    if (status === 'FULFILLED' && payload){
        aside.innerHTML = ''
        for (const {_id, name} of payload){
            aside.innerHTML += `<a href="#/category/${_id}">${name}</a>`
        }
    }
})
store.subscribe(() => {
    const [,route] = location.hash.split('/')
    if (route !== 'category') return
    const {status, payload, error} = store.getState().promise.catById || {}//.имя одно
    if (status === 'PENDING'){
        main.innerHTML = `<img src='https://cdn.dribbble.com/users/63485/screenshots/1309731/infinite-gif-preloader.gif' />`
    }
    if (status === 'FULFILLED'){
        console.log(payload)
        const {name, goods} = payload
        main.innerHTML = `<h1>${name}</h1>`
        for (const {_id, name, price, images} of goods){
            main.innerHTML += `<a href="#/good/${_id}">${name}
            <img src = "http://shop-roles.node.ed.asmer.org.ua/${images[0].url}">
            </a>`
        }
    }
})
store.subscribe(() => {
    const payload = store.getState().auth.payload
    if(payload){ 
        username.innerHTML = payload.sub.login
        let logoutButton = document.createElement('button')
        username.appendChild(logoutButton)
        logoutButton.innerText = 'LOGOUT'
        logoutButton.onclick = () =>{
            store.dispatch(actionAuthLogout())
            window.onhashchange()
        }
    }else{        
        username.innerHTML = `<a href="#/login/">LOGIN</a>`
    }
})
store.subscribe(() => {
    register.innerHTML = `<a href ="#/register/">REGISTER</a>`
})
const drawGoods = (state) => {
    const [,route] = location.hash.split('/')
    if (route !== 'good') return
    const {status, payload, error} = store.getState().promise.goodFindOne || {}//.имя другое
    if (status === 'PENDING'){
        main.innerHTML = `<img src='https://cdn.dribbble.com/users/63485/screenshots/1309731/infinite-gif-preloader.gif' />`
    }
    if (status === 'FULFILLED'){
        const {name, _id, price, description, images} = payload
        let orderButton = document.createElement('button')
            orderButton.innerText = "Додати до кошика"
            orderButton.onclick = () => {
                store.dispatch(actionCartAdd(payload))
            }
        main.innerHTML = `<h1>${name}</h1>
                         <section>Ціна: ${price}</section>
                         <section>Опис товару: ${description}</section>
                         <img src = "http://shop-roles.node.ed.asmer.org.ua/${images[0].url}">
                         `
                         main.append(orderButton)                          
    }
}
store.subscribe(drawGoods)
// Форма логіну, реєстраціі і історіі замовлень
function LoginPassword(parent, open){
    let loginInput = document.createElement('input')
    let passwordInput = document.createElement('input')
    let checkButton = document.createElement('button')

    checkButton.innerText = 'LOGIN'
    checkButton.disabled = true
    loginInput.type = 'text'
    passwordInput.type = 'password'
    loginInput.placeholder = "Введіть логін"
    passwordInput.placeholder = "Введіть пароль"
    this.status = open

    parent.append(loginInput)
    parent.append(passwordInput)
    parent.append(checkButton)
    this.getLoginValue = function(){
        return loginInput.value
    }
    this.getPasswordValue = function(){
        return passwordInput.value
    }
    this.setLoginValue = function(newValue){
        loginInput.value = newValue 
        return loginInput.value
    }
    this.setPasswordValue = function(newValue){
        return passwordInput.value = newValue
    }
    this.getCheckButton = function(){
        return this.status
    }
    this.setCheckButton = function(status){   
        return this.status = status  
    }
    this.onChange = function(){         
        return loginInput.value
    }
    this.onChange2 = function(){
        return passwordInput.value
    }
    this.onButtonChange = function(status){      
        return status 
    }
    loginInput.oninput = () =>{
       this.onChange(loginInput.value)
    }    
    this.onChange = () =>{
        return loginInput.value
    }
    this.onChange2 = () =>{
        return passwordInput.value
    } 
    passwordInput.oninput = () => {
        this.onChange2(passwordInput.value)    
        if(loginInput.value !== "" && passwordInput.value !==""){
            checkButton.disabled = false
         }else{
             checkButton.disabled = true
         }
    }
    if(typeof this.onclick === 'function'){
        return this.onclick(login,password)
    }
    checkButton.onclick = () =>{
        this.onclick(this.getLoginValue(), this.getPasswordValue())
    }
    this.setCheckButton(open)
}
function Registration(parent){
    let loginInput = document.createElement('input')
    let passwordInput = document.createElement('input')
    let checkPasswordInput = document.createElement('input')
    let checkButton = document.createElement('button')

    checkPasswordInput.type = 'password'
    checkPasswordInput.style.display = 'initial'
    this.status = false
    checkButton.innerText = 'REGISTER'
    checkButton.disabled = true
    loginInput.type = 'text'
    passwordInput.type = 'password'
    checkPasswordInput.type = 'password'
    loginInput.placeholder = "Введіть логін"
    passwordInput.placeholder = "Введіть пароль"
    checkPasswordInput.placeholder = "Введіть повторно пароль"

    parent.append(loginInput)
    parent.append(passwordInput)
    parent.append(checkPasswordInput)
    parent.append(checkButton)

    this.getLoginValue = function(){
        return loginInput.value
    }
    this.getPasswordValue = function(){
        return passwordInput.value
    }
    this.getCheckValue = function(){
        return checkPasswordInput.value
    }
    this.setLoginValue = function(newValue){
        loginInput.value = newValue 
        return loginInput.value
    }
    this.setPasswordValue = function(newValue){
        return passwordInput.value = newValue
    }
    this.setCheckValue = function(newValue){
        return checkPasswordInput.value = newValue
    }
    this.setStyle = (style,style2) => {
        passwordInput.style.borderColor = style
        checkPasswordInput.style.borderColor = style2
    }
    this.getCheckButton = function(){
        return this.status
    }
    this.setCheckButton = function(status){   
        return this.status = status  
    }
    this.onChange = function(){         
        return loginInput.value
    }
    this.onChange2 = function(){
        return passwordInput.value
    }
    this.onChange3 = function(){
        return checkPasswordInput.value
    }
    this.onButtonChange = function(status){      
        return status 
    }
    loginInput.oninput = () =>{
       this.onChange(loginInput.value)
    }    
    this.onChange = () =>{
        return loginInput.value
    }
    this.onChange2 = () =>{
        return passwordInput.value
    } 
    passwordInput.oninput = () => {
        this.onChange2(passwordInput.value)    
        if(loginInput.value !== "" && passwordInput.value !==""){
            checkButton.disabled = false
        }else{
            checkButton.disabled = true
        }
         if(passwordInput.value !== checkPasswordInput.value){
            this.setStyle('red', 'red')
        }else{
            this.setStyle('black','black')
        }   
    }
    checkPasswordInput.oninput = () =>{
        this.onChange3(checkPasswordInput.value)
        if(checkPasswordInput.value !== passwordInput.value){
            this.setStyle('red', 'red')
        }else{
            this.setStyle('black','black')
        }  
    }
    if(typeof this.onclick === 'function'){
        return this.onclick(login,password)
    }
    checkButton.onclick = () =>{
        this.onclick(this.getLoginValue(), this.getPasswordValue(), this.getCheckValue())
    }
    this.setCheckButton(this.status)
}
function CartButtons(parent){
    let minusButton = document.createElement('button')
    let numberInput = document.createElement('input')
    let plusButton = document.createElement('button')
    let acceptButton = document.createElement('button')
    let deleteButton = document.createElement('button')

    numberInput.type = 'number'
    minusButton.innerText = "-"
    plusButton.innerText = "+"
    acceptButton.innerText = "Додати кількість"
    deleteButton.innerText = "Видалити товар"

    this.getNumberImputValue = function(){
        return numberInput.value
    }
    this.setNumberImputValue = function(newNumber){
        return numberInput.value = newNumber
    }
    this.onAcceptButton = function () {
        if (typeof this.acceptHandler === 'function') {
            this.acceptHandler();
        }
    }
    this.onDeleteButton = function () {
        if (typeof this.deleteHandler === 'function') {
            this.deleteHandler();
        }
    }
    numberInput.oninput = () => {
        this.setNumberImputValue()
    }
    minusButton.onclick = () => {
        let value = parseInt(numberInput.value) || 0
        this.setNumberImputValue(value -1) 
    }
    plusButton.onclick= () =>{
        let value = parseInt(numberInput.value) || 0
        this.setNumberImputValue(value+ 1)
    } 
    acceptButton.onclick = () => this.onAcceptButton()
    deleteButton.onclick = () => this.onDeleteButton()

    parent.append(minusButton)
    parent.append(numberInput)
    parent.append(plusButton)
    parent.append(acceptButton)
    parent.append(deleteButton)    
}
// Функція для url
window.onhashchange = () => {
    console.log(location.hash, "loc")
    const [,route, _id] = location.hash.split('/')
    main.innerHTML = ""
    const routes = {
        history(){
           store.dispatch(actionPromise('history', gqlOrderFind()))
        },
        cart(){
            const cartItems = store.getState().cart;
            let cartContent = document.createElement('div')
            for (const key in cartItems) {             
                let buttonsDiv = document.createElement('div')
                const helpButtons = new CartButtons(buttonsDiv) 
                let { good, count } = cartItems[key];
                const { name, description, price, images } = good; 
                helpButtons.acceptHandler = function() {
                    count = helpButtons.getNumberImputValue() 
                    store.dispatch(actionCartSet(good, +count))
                    routes.cart()
                }
                helpButtons.deleteHandler = function(){
                    store.dispatch(actionCartDel(good))
                    routes.cart()
                } 
                let goodDiv = document.createElement('div')
                goodDiv.innerHTML = `
                    Назва: ${name}.
                    Опис: ${description}.
                    Ціна: ${price}.
                    <img src="http://shop-roles.node.ed.asmer.org.ua/${images[0].url}">
                    Кількість: ${count}</div> `
                    cartContent.append(buttonsDiv)
                    cartContent.append(goodDiv)
            }         
            main.innerHTML = ""
            main.append(cartContent)
            let orderButton = document.createElement('button')
            orderButton.innerText = 'Оформити замовлення'
            orderButton.onclick = () => {
                store.dispatch(actionMakeOrder())
            }
            main.append(orderButton)
        },
        category() {
            store.dispatch(actionCatById(_id))
        },
        good(){
            store.dispatch(actionGoodById(_id)) 
        },
        login(){
            let loginForm = new LoginPassword(main)
            loginForm.onclick = (login, password) => {
                store.dispatch(actionFullLogin(login,password))
                location.hash = "#/"
            }
        },
        register(){
            let registerForm = new Registration(main)
            registerForm.onclick = (login,password) => {
                store.dispatch(actionFullRegister(login,password))
                register.innerHTML = ''
                location.hash = "#/"
            }
        },
    }
    if (route in routes){
        routes[route]()
    }
}
window.onhashchange()