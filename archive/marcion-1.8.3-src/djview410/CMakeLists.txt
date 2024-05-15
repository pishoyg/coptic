cmake_minimum_required(VERSION 2.8)
project (DjView)

set(UI_FILES
"qdjviewerrordialog"
"qdjviewauthdialog"
"qdjviewinfodialog"
"qdjviewmetadialog"
"qdjviewsavedialog"
"qdjviewprintdialog"
"qdjviewexportdialog"
"qdjviewexportps1"
"qdjviewexportps2"
"qdjviewexportps3"
"qdjviewexporttiff"
"qdjviewexportprn"
"qdjviewprefsdialog")
set(MOC_FILES
"qdjvu"
"qdjvunet"
"qdjvuwidget"
"qdjviewprefs"
"qdjviewsidebar"
"qdjviewdialogs"
"qdjviewexporters"
"qdjview"
"djview")
set(MOC2_FILES
"qdjvu"
"qdjvunet"
"qdjvuwidget"
"qdjviewprefs"
"qdjviewsidebar"
"qdjviewexporters"
"qdjviewplugin")
set(RC_FILES
"qdjvuwidget"
"qdjview")

make_qt_file(UI "${QT_UIC_EXECUTABLE}" "${CMAKE_SOURCE_DIR}/djview410" "ui" "ui_" "h")
make_qt_file(MOC "${QT_MOC_EXECUTABLE}" "${CMAKE_SOURCE_DIR}/djview410" "h" "moc_" "cpp")
make_qt_file(MOC2 "${QT_MOC_EXECUTABLE}" "${CMAKE_SOURCE_DIR}/djview410" "cpp" "" "moc")
make_rc_file(RC "${QT_RCC_EXECUTABLE}" "${CMAKE_SOURCE_DIR}/djview410" "qrc" "qrc_" "cpp")


add_library(djview STATIC qdjvu.cpp qdjvunet.cpp qdjvuwidget.cpp qdjviewprefs.cpp qdjviewsidebar.cpp qdjviewdialogs.cpp qdjviewexporters.cpp qdjview.cpp djview.cpp qdjviewplugin.cpp moc_qdjvu.cpp moc_qdjvunet.cpp moc_qdjvuwidget.cpp moc_qdjviewprefs.cpp moc_qdjviewsidebar.cpp moc_qdjviewdialogs.cpp moc_qdjviewexporters.cpp moc_qdjview.cpp moc_djview.cpp qrc_qdjvuwidget.cpp qrc_qdjview.cpp)
