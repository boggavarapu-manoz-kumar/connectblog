const { ZodError } = require('zod');

const validate = (schema) => (req, res, next) => {
    try {
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        next();
    } catch (err) {
        if (err instanceof ZodError) {
            const errors = err.errors.map((e) => ({
                field: e.path.join('.').replace('body.', '').replace('query.', '').replace('params.', ''),
                message: e.message
            }));
            return res.status(400).json({
                message: errors[0].message,
                errors
            });
        }
        next(err);
    }
};

module.exports = validate;
