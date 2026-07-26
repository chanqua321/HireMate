namespace Common;

public static class Const
{
    public static int ERROR_EXCEPTION = -4;
    public static int ERROR_VALIDATION_CODE = -2;

    public static int SUCCESS_CREATE_CODE = 1;
    public static string SUCCESS_CREATE_MSG = "Lưu dữ liệu thành công";
    public static int SUCCESS_READ_CODE = 1;
    public static string SUCCESS_READ_MSG = "Lấy dữ liệu thành công";
    public static int SUCCESS_LOGIN_CODE = 1;
    public static int SUCCESS_UPDATE_CODE = 1;
    public static string SUCCESS_UPDATE_MSG = "Cập nhật dữ liệu thành công";

    public static int FAIL_CREATE_CODE = -1;
    public static string FAIL_CREATE_MSG = "Lưu dữ liệu thất bại";
    public static int FAIL_READ_CODE = -1;
    public static string FAIL_READ_MSG = "Lấy dữ liệu thất bại";
    public static int FAIL_UPDATE_CODE = -1;
    public static string FAIL_UPDATE_MSG = "Cập nhật dữ liệu thất bại";

    public static int WARNING_NO_DATA_CODE = 4;
    public static string WARNING_NO_DATA_MSG = "Không có dữ liệu";

    public static int FAIL_QUOTA_CODE = -3;
    public static string FAIL_QUOTA_MSG = "Gói Free giới hạn 3 phiên phỏng vấn mỗi tháng";
}
