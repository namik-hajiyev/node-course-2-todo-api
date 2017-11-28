require('./config/config');
const express = require("express");
const bodyParser = require("body-parser");
const _ = require("lodash");
const {
    mongoose
} = require("./db/mongoose");
const {
    User
} = require("./models/user");
const {
    Todo
} = require("./models/todo");

const {
    ObjectID
} = require("mongodb");
const {
    authenticate
} = require("./middleware/authenticate");

const port = process.env.PORT;
const app = express();

app.use(bodyParser.json());

app.post("/todos", authenticate, (req, res) => {
    var todo = new Todo({
        text: req.body.text,
        _creator: req.user._id
    });
    todo.save().then((todo) => {
        res.send({
            todo
        });
    }).catch((error) => {
        res.status(400).send({
            error
        });
    });
});

app.get("/todos", authenticate, (req, res) => {
    Todo.find({
        _creator: req.user._id
    }).then((todos) => {
        res.send({
            todos
        });
    }).catch((error) => {
        res.status(400).send({
            error
        });
    });
});

app.get("/todos/:id", authenticate, (req, res) => {
    var id = req.params.id;
    if (!ObjectID.isValid(id)) {
        return res.status(404).send({
            message: "Invalid id"
        });
    }
    Todo.findOne({
        _id: id,
        _creator: req.user._id
    }).then((todo) => {
        if (!todo) {
            return res.status(404).send({
                message: "Todo not found"
            });
        }
        res.send({
            todo
        });
    }).catch((error) => {
        res.status(400).send({
            error
        });
    });
});

app.delete("/todos/:id", authenticate, (req, res) => {
    var id = req.params.id;
    if (!ObjectID.isValid(id)) {
        return res.status(404).send({
            message: "Invalid id"
        });
    }
    Todo.findOneAndRemove({
        _id: id,
        _creator: req.user._id
    }).then((todo) => {
        if (!todo) {
            return res.status(404).send({
                message: "Todo not found"
            });
        }
        res.send({
            todo
        });
    }).catch((error) => {
        res.status(400).send({
            error
        });
    });

});

app.patch("/todos/:id", authenticate, (req, res) => {
    var id = req.params.id;
    var body = _.pick(req.body, ['text', 'completed']);
    if (!ObjectID.isValid(id)) {
        return res.status(404).send({
            message: "Invalid id"
        });
    }
    if (_.isBoolean(body.completed) && body.completed) {
        body.completedAt = new Date().getTime();
    } else {
        body.completed = false;
        body.completedAt = null;
    }
    Todo.findOneAndUpdate({
        _id: id,
        _creator: req.user._id
    }, {
        $set: body
    }, {
        new: true
    }).then((todo) => {
        if (!todo) {
            return res.status(404).send({
                message: "Todo not found"
            });
        }
        res.send({
            todo
        });
    }).catch((error) => {
        res.status(400).send({
            error
        });
    });

});

app.post("/users", (req, res) => {
    var body = _.pick(req.body, ['email', 'password']);
    var user = new User(body);
    user.save().then(() => {
            return user.generateAuthToken();
        })
        .then((token) => {
            res.header('x-auth', token).send(user);
        })
        .catch((error) => {
            res.status(400).send({
                error
            });
        });
});

app.post("/users/login", (req, res) => {
    var body = _.pick(req.body, ['email', 'password']);
    User.findByCredentials(body.email, body.password).then((user) => {
        user.generateAuthToken().then((token) => {
            res.header('x-auth', token).send(user);
        });
    }).catch((e) => {
        res.status(400).send();
    });
});

app.get("/users/me", authenticate, (req, res) => {
    res.send(req.user);
});

app.delete("/users/me/token", authenticate, (req, res) => {
    req.user.removeToken(req.token).then(() => {
            res.status(200).send();
        },
        () => {
            res.status(400).send();
        }
    );
});

app.listen(port, () => {
    console.log(`Started on port ${port}`);
});
module.exports = {
    app
}