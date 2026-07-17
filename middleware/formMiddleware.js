export const formStateMiddleware = (req, res, next) => {
    const originalRender = res.render;

    res.render = function (view, options, callback) {
        options = options || {};

        if (options.error && req.method === 'POST') {
            const formData = { ...req.body };

            const sensitiveFields = [
                'password', 'confirmPassword', 'newPassword', 'oldPassword',
                'otp', 'otp1', 'otp2', 'otp3', 'otp4', 'otp5', 'otp6',
                'cvv', 'securityCode', 'cardNumber'
            ];

            sensitiveFields.forEach(field => {
                delete formData[field];
            });

            options.formData = options.formData || formData;
        }


        if (options.error && options.fieldErrors && Object.keys(options.fieldErrors).length > 0) {
            const firstErrorKey = Object.keys(options.fieldErrors)[0];
            options.error = options.fieldErrors[firstErrorKey];
        }

        originalRender.call(this, view, options, callback);
    };

    next();
};
