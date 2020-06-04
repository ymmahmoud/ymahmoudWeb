<!DOCTYPE HTML>
<html lang="en" class="no-js" style="overflow: scroll;">

<head>
    <title>LTFD | Hall Rental</title>
    <?php include_once 'Resources/PHP/includes.php' ?>
</head>

<body>
    <?php include_once 'Resources/PHP/nav.php' ?>
    <div class="container-fluid jumbotron text-center">
        <h1>Rent out our fire hall for your next event!</h1>
    </div>
    <form class="col-lg-4 col-md-6 col-sm-12 mx-auto">
        <div class="form-group">
            <label for="exampleInputEmail1">Email address</label>
            <input type="email" class="form-control" id="exampleInputEmail1" aria-describedby="emailHelp"
                placeholder="Enter email">
            <small id="emailHelp" class="form-text text-muted">We'll never share your email with anyone else.</small>
        </div>
        <div class="form-group">
            <label for="exampleInputPassword1">Password</label>
            <input type="password" class="form-control" id="exampleInputPassword1" placeholder="Password">
        </div>
        <div class="form-check">
            <input type="checkbox" class="form-check-input" id="exampleCheck1">
            <label class="form-check-label" for="exampleCheck1">Check me out</label>
        </div>
        <button type="submit" class="btn btn-primary">Submit</button>
    </form>
</body>

</html>