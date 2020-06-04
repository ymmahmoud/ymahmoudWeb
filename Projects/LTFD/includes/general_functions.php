<?php
require_once "user.php";
session_start();
if(isset($_POST['action']) && !empty($_POST['action'])) {
    $action = $_POST['action'];
    $GLOBALS['path'] = "../";
    switch($action) {
        case 'is_logged_in' : echo user::is_logged_in()?"WORKED":"DID NOT WORK";break;
        case 'login' : echo user::login($_POST['username'],$_POST['password']) ? "Success" : "Wrong username or password";break;
        case 'create_account' : $error = "psw does not match";echo ($_POST['password'] == $_POST['confpswd'] && user::create_account($_POST,$error)) ? "Success" : $error;break;
        case 'logout' : echo user::logout() ? "Logged Out" :"Error";break;
        case 'add_admin':
            $error = null;
            $user = new user();
            if (!user::get_user_by_username($_POST['username'],$user)) {
                $error = "Something went wrong";
                header("Location: ../adminPage.php?msg=$error");
                exit;
            }
            $user->add_rank('admin');
            $msg = "Done!";
            header("Location: ../adminPage.php?msg=$msg");
            break;
        case 'remove_admin':
            $error = null;
            $user = new user();
            if (!user::get_user_by_username($_POST['username'],$user)) {
                $error = "Something went wrong";
                header("Location: ../adminPage.php?msg=$error");
                exit;
            }

            $user->remove_rank('admin');
            $msg = "Done!";
            header("Location: ../adminPage.php?msg=$msg");
            break;
        case 'add_vendor':
            $error = null;
            $user = new user();
            if (!user::get_user_by_username($_POST['username'],$user)) {
                $error = "Something went wrong";
                header("Location: ../adminPage.php?msg=$error");
                exit;
            }
            $user->add_rank('vender');
            $msg = "Done!";
            header("Location: ../adminPage.php?msg=$msg");
            break;
        case 'remove_vendor':
            $error = null;
            $user = new user();
            if (!user::get_user_by_username($_POST['username'],$user)) {

                header("Location: ../adminPage.php?msg=$error");
                exit;
            }
            $user->remove_rank('vender');
            $msg = "Done!";
            header("Location: ../adminPage.php?msg=$msg");
            break;
    }
}
