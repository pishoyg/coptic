# -------------------------------------------------
# Project created by QtCreator 2009-11-02T05:40:19
# -------------------------------------------------

CONFIG += poppler
#DEFINES += NO_POPPLER

QT += core gui network webkit xml
TARGET = marcion
TEMPLATE = app
SOURCES += cwordtemplate.cpp \
    dialects3.cpp \
    grammar.cpp \
    wordpreview.cpp \
    addword.cpp \
    lsj.cpp \
    librarywidget.cpp \
    ctranslit.cpp \
    cmysql.cpp \
    searchcriteria2.cpp \
    worditem.cpp \
    messages.cpp \
    reorder.cpp \
    tlgselector2.cpp \
    librarysearch.cpp \
    crumwidget.cpp \
    bookreader.cpp \
    djvuwidget.cpp \
    libsearchresult.cpp \
    settings.cpp \
    latcopt.cpp \
    main.cpp \
    booktextbrowser.cpp \
    mimage.cpp \
    mbzip.cpp \
    mainwnd.cpp \
    crumresulttree.cpp \
    textcolorchooser.cpp \
    textbrowserext.cpp \
    aboutdialog.cpp \
    marckeyb.cpp \
    licensedialog.cpp \
    outstr.cpp \
    progressdialog.cpp \
    tbldesigner.cpp \
    htmlindexdialog.cpp \
    htmlreader.cpp \
    graphicsarea.cpp \
    intlintr.cpp \
    translat.cpp \
    copinttr.cpp \
    translitem.cpp \
    exporttr.cpp \
    translbook.cpp \
    treecombobox.cpp \
    bookedit.cpp \
    regexpbuilder.cpp \
    mlibtitle.cpp \
    mexecsql.cpp \
    libsearchbase.cpp \
    libbase.cpp \
    filechooser.cpp \
    mmsgtitle.cpp \
    mdownloadweb.cpp \
    mindexdir2.cpp \
    mlibsearchtitle.cpp \
    msetttitle.cpp \
    mlabel.cpp \
    cmsgbrowser.cpp \
    mbuildconfig.cpp \
    mhistory.cpp \
    meditimgitem.cpp \
    mreorderimageitem.cpp \
    mimagewidget.cpp \
    mnewindexdir.cpp \
    mlibrarybranches.cpp \
    marchiveitem.cpp \
    mchoosecategory.cpp \
    mdroparchive.cpp \
    marchiver.cpp \
    mcreatearchive.cpp \
    msetarchivedata.cpp \
    mfsclip.cpp \
    mlibtreewidget.cpp \
    mdocumentbase.cpp \
    mtcpserver.cpp \
    msessiondialog.cpp \
    mtcplistenwidget.cpp \
    mremaptgz.cpp \
    mcopticnumerals.cpp \
    mcmbboxresult.cpp \
    mprogressicon.cpp \
    mrenamedialog.cpp \
    mcontentbook.cpp \
    mspiniter.cpp \
    msimulitem.cpp \
    mversedbook.cpp \
    marchivewidget.cpp \
    mvbooksbw.cpp \
    mdocheader.cpp \
    mdjvureader2.cpp \
    mimagebookreader.cpp \
    mwindowswidget.cpp \
    mopenbooktitle.cpp \
    msrwidget.cpp \
    mnotepad.cpp \
    msbeditwdg.cpp \
    mfontchooser.cpp \
    mexportarchive.cpp \
    mtipofthewiseman.cpp \
    mnavwnd.cpp \
    mmaps.cpp \
    mhebrdict.cpp

poppler{
    SOURCES +=  mpdfsbwdg.cpp \
                mpdfreader2.cpp
}

HEADERS += latcopt.h \
    settings.h \
    lsj.h \
    wordpreview.h \
    addword.h \
    searchcriteria2.h \
    grammar.h \
    cwordtemplate.h \
    crumwidget.h \
    dialects3.h \
    booktextbrowser.h \
    librarywidget.h \
    worditem.h \
    tlgselector2.h \
    cmysql.h \
    ctranslit.h \
    djvuwidget.h \
    bookreader.h \
    librarysearch.h \
    libsearchresult.h \
    reorder.h \
    messages.h \
    mimage.h \
    mbzip.h \
    mainwnd.h \
    crumresulttree.h \
    textcolorchooser.h \
    textbrowserext.h \
    aboutdialog.h \
    marckeyb.h \
    licensedialog.h \
    outstr.h \
    progressdialog.h \
    tbldesigner.h \
    htmlindexdialog.h \
    htmlreader.h \
    graphicsarea.h \
    intlintr.h \
    translat.h \
    copinttr.h \
    translitem.h \
    exporttr.h \
    translbook.h \
    treecombobox.h \
    bookedit.h \
    regexpbuilder.h \
    mlibtitle.h \
    mexecsql.h \
    libsearchbase.h \
    libbase.h \
    filechooser.h \
    mmsgtitle.h \
    mdownloadweb.h \
    mindexdir2.h \
    mlibsearchtitle.h \
    msetttitle.h \
    mlabel.h \
    cmsgbrowser.h \
    mbuildconfig.h \
    mhistory.h \
    meditimgitem.h \
    mreorderimageitem.h \
    mimagewidget.h \
    mnewindexdir.h \
    mlibrarybranches.h \
    marchiveitem.h \
    mchoosecategory.h \
    mdroparchive.h \
    marchiver.h \
    mcreatearchive.h \
    msetarchivedata.h \
    mfsclip.h \
    mlibtreewidget.h \
    mdocumentbase.h \
    mtcpserver.h \
    msessiondialog.h \
    mtcplistenwidget.h \
    mremaptgz.h \
    mcopticnumerals.h \
    mcmbboxresult.h \
    mprogressicon.h \
    mrenamedialog.h \
    mcontentbook.h \
    mspiniter.h \
    msimulitem.h \
    mversedbook.h \
    marchivewidget.h \
    mvbooksbw.h \
    mdocheader.h \
    mdjvureader2.h \
    mimagebookreader.h \
    mwindowswidget.h \
    mopenbooktitle.h \
    msrwidget.h \
    mnotepad.h \
    msbeditwdg.h \
    mfontchooser.h \
    mexportarchive.h \
    mtipofthewiseman.h \
    mnavwnd.h \
    mmaps.h \
    mhebrdict.h

poppler{
    HEADERS +=  mpdfsbwdg.h \
                mpdfreader2.h
}

FORMS += crumwidget.ui \
    messages.ui \
    librarywidget.ui \
    booktextbrowser.ui \
    lsj.ui \
    wordpreview.ui \
    libsearchresult.ui \
    latcopt.ui \
    librarysearch.ui \
    settings.ui \
    grammar.ui \
    searchcriteria2.ui \
    addword.ui \
    tlgselector2.ui \
    mainwnd.ui \
    reorder.ui \
    textcolorchooser.ui \
    aboutdialog.ui \
    marckeyb.ui \
    licensedialog.ui \
    progressdialog.ui \
    tbldesigner.ui \
    htmlindexdialog.ui \
    htmlreader.ui \
    intlintr.ui \
    translat.ui \
    copinttr.ui \
    translitem.ui \
    exporttr.ui \
    bookedit.ui \
    regexpbuilder.ui \
    mlibtitle.ui \
    mexecsql.ui \
    filechooser.ui \
    mmsgtitle.ui \
    mdownloadweb.ui \
    mindexdir2.ui \
    mlibsearchtitle.ui \
    msetttitle.ui \
    mbuildconfig.ui \
    mhistory.ui \
    meditimgitem.ui \
    mreorderimageitem.ui \
    mimagewidget.ui \
    mnewindexdir.ui \
    mlibrarybranches.ui \
    marchiveitem.ui \
    mchoosecategory.ui \
    mdroparchive.ui \
    marchiver.ui \
    mcreatearchive.ui \
    msetarchivedata.ui \
    msessiondialog.ui \
    mtcplistenwidget.ui \
    mremaptgz.ui \
    mcopticnumerals.ui \
    mrenamedialog.ui \
    mcontentbook.ui \
    mspiniter.ui \
    msimulitem.ui \
    mversedbook.ui \
    marchivewidget.ui \
    mvbooksbw.ui \
    mdocheader.ui \
    mdjvureader2.ui \
    mimagebookreader.ui \
    mwindowswidget.ui \
    mopenbooktitle.ui \
    mnotepad.ui \
    msbeditwdg.ui \
    mfontchooser.ui \
    mexportarchive.ui \
    mtipofthewiseman.ui \
    dialects3.ui \
    mnavwnd.ui \
    mmaps.ui \
    mhebrdict.ui

poppler{
    FORMS += mpdfsbwdg.ui \
             mpdfreader2.ui
}

RESOURCES += resfile.qrc \
    splash.qrc
TRANSLATIONS =  marcion_cs.ts
