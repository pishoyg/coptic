#-------------------------------------------------
#
# Project created by QtCreator 2011-04-13T00:11:12
#
#-------------------------------------------------

QT       -= gui

TARGET = ibycus
TEMPLATE = lib
CONFIG += staticlib

SOURCES += \
    IbycusTxtFile.cpp \
    IbycusId.cpp \
    IbycusAuthTab.cpp \
    IbycusIdNumber.cpp \
    IbycusIdFile.cpp \
    IbycusIdException.cpp \
    IbycusAuthTabAuthor.cpp \
    IbycusAuthTabCorpus.cpp \
    IbycusFile.cpp \
    IbycusIdt.cpp \
    IbycusIdtAuth.cpp \
    IbycusIdtSection.cpp \
    IbycusIdtWork.cpp \
    IbycusTxtLine.cpp

HEADERS += \
    IbycusTxtLine.h \
    IbycusTxtFile.h \
    IbycusString.h \
    IbycusParseException.h \
    IbycusNoId.h \
    IbycusIdtWork.h \
    IbycusIdtSection.h \
    IbycusIdtAuth.h \
    IbycusIdt.h \
    IbycusIdNumber.h \
    IbycusIdFile.h \
    IbycusIdException.h \
    IbycusId.h \
    IbycusFileException.h \
    IbycusFile.h \
    IbycusException.h \
    IbycusDefs.h \
    IbycusCit.h \
    IbycusAuthTabCorpus.h \
    IbycusAuthTabAuthor.h \
    IbycusAuthTab.h

unix:!symbian {
    maemo5 {
        target.path = /opt/usr/lib
    } else {
        target.path = /usr/local/lib
    }
    INSTALLS += target
}
