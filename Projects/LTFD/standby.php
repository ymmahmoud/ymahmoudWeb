<!DOCTYPE HTML>
<html lang="en" class="no-js" style="overflow: scroll;">

<head>
    <title>LTFD | Standby Request</title>
    <?php include_once 'Resources/PHP/includes.php' ?>
</head>

<body>
<?php include_once 'Resources/PHP/nav.php' ?>
<div class="container-fluid jumbotron text-center">
    <h1>Request a standby!</h1>
</div>
<form class="card p-5 mb-5 col-lg-5 col-md-6 col-sm-12 mx-auto text-center">
    <div class="form-group">
        <input type="text" class="form-control" id="org"
               placeholder="Organization Name" required>
        <!--        <small id="emailHelp" class="form-text text-muted">We'll never share your email with anyone else.</small>-->
    </div>
    <div class="form-group">
        <input type="text" class="form-control" id="name"
               placeholder="Point of Contact Name" required>
    </div>
    <div class="form-group">
        <input type="tel" class="form-control" id="tel"
               placeholder="Telephone Number" required>
    </div>
    <div class="form-group">
        <input type="text" class="form-control" id="type"
               placeholder="Type of Event" required>
    </div>
    <div class="form-group">
        <div class="row mx-auto">
        <p>Date: </p>
        <input type="date" id="date" name="date"
               min="2020-01-01" max="2021-12-31" required>
                    <p> Start Time</p>
                    <input type="time" id="start" name="starttime"
                           min="09:00" max="18:00" required>
                    <p> End Time</p>
                    <input type="time" id="end" name="endtime"
                           min="09:00" max="18:00" required>
        </div>
    </div>
    <div class="form-check">
        <input type="checkbox" class="form-check-input" id="twoweek" required>
        <label class="form-check-label" for="twoweek">I agree that standby requests that aren't
        submitted at least two weeks in advance may not be honored.</label>
    </div>
    <button type="submit" class="btn btn-primary">Submit</button>
</form>
</body>

</html>