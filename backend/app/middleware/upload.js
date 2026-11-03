const path=require('path')
const fs=require('fs')
const multer=require('multer')


const FILE_TYPE_MAP={
    'image/png':'png',
    'image/jpeg':'jpeg',
    'image/jpg':'jpg',
    'image/gif':'gif',
    'image/bmp':'bmp'
}





const storage=multer.diskStorage({
    destination:function(req,file,cb){
        const isValid=FILE_TYPE_MAP[file.mimetype]
        let uploadError=new Error('invalid image type')
        if(isValid){
            uploadError=null
        }
        cb(uploadError,'uploads')
    },
    filename:function(req,file,cb){
        // Use the parsed name (without extension) and replace spaces
        const parsed = path.parse(file.originalname);
        const fileName = parsed.name.split(' ').join('_');
        const extension = FILE_TYPE_MAP[file.mimetype];
        cb(null, `${fileName}-${Date.now()}.${extension}`);
    }
})
const upload=multer({storage:storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
})

upload.cleanupLocalFiles = function(req, res, next) {
    res.once('finish', function() {
        const files = [
            ...(Array.isArray(req.files) ? req.files : Object.values(req.files || {}).flat()),
            ...(req.file ? [req.file] : [])
        ]

        for (const file of files) {
            if (!file.path) continue

            try {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path)
                }
            } catch (error) {
                console.error('Failed to remove temporary upload:', error.message)
            }
        }
    })

    next()
}

module.exports = upload