module.exports.time = function(ms = null) {
    return Math.round(ms || Date.now() / 1000);
}

module.exports.daystamp = function(ts = null) {
	return Math.floor(time(ts) / (60*60*24));
}

module.exports.Wait = function(ms) {
	return new Promise((res,rej) => {
		setTimeout(res, ms);
	})
}

module.exports.UID = (length, charset = null) => {
	if (typeof charset !== 'string') charset = module.exports.UID.CHSET_64;
	
	let res = "";
	for(let i=0; i < length; i++) {
		res += charset[Math.round(charset.length * 10 * Math.random()) % charset.length];
	}
	return res;
};

module.exports.UID.CHSET_UPPER = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
module.exports.UID.CHSET_FULL = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
module.exports.UID.CHSET_64 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-";
module.exports.UID.CHSET_UCLET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";


module.exports.Assign = function(source, ...assignables){
    if(typeof source === 'object'){
        for (let cli of assignables) {
			if(arPlain(cli)) arMerge( source, cli );
		}
    }
    return source;
}

function arAssign(a, k, v){
    if(arPlain(v)){
        if(!arPlain(a[k])) a[k] = {};
        arMerge(a[k], v);
    }else{
        a[k] = v;
    }
}

function arMerge( target, data ){
	for(let key of Object.keys(data)) 
		arAssign(target, key, data[key]);
}

function arPlain(obj){
    return obj != null && obj !== undefined 
		&& obj.constructor !== undefined 
		&& obj.constructor.prototype === Object.prototype;
}
