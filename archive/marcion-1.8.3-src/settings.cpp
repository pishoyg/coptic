/*  Marcion
    Copyright (C) 2009-2016 Milan Konvicka

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along
    with this program; if not, write to the Free Software Foundation, Inc.,
    51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA. */

#include "settings.h"
#include "ui_settings.h"

//
#define WRITETOCFG(STRING) \
        if(writecfgline(f,STRING)==-1) \
	{\
                messages->MsgErr(QObject::tr("cannnot write into file"));\
                f.close();\
		return;\
	}

CSettings * _m_sett(0);
void set_m_sett(CSettings *s){_m_sett=s;}
CSettings * m_sett(){return _m_sett;}

QString CSettings::marcDir=QString();
QString CSettings::_cfgfile("config.txt");

MBuildConfig * CSettings::wiz(0);
QStringList CSettings::openFiles=QStringList();
MListFileItem CSettings::recentFiles=MListFileItem();
MTcpServer * CSettings::tcpServer=new MTcpServer();
QDateTime CSettings::app_start_time=QDateTime();

bool CSettings::_ro_mode(false);

CSettings::CSettings( CMessages * messages,
                      QTabWidget ** main_tab,
                      MSRWidget ** sr_tab,
                      MWindowsWidget * windows_widget,
                      QWidget * parent)
    : QWidget(parent),
      ui(new Ui::frmSettings),
      messages(messages),
      _mtab(main_tab),
      _sr_tab(sr_tab),
      _wnds(windows_widget),
      ifmts(),
      iffilters("image ("),ifcmp(),
      _tmpDir(QDesktopServices::storageLocation(QDesktopServices::TempLocation)),
      _cop_font(),_gk_font(),_lat_font(),_hb_font()
{
    ui->setupUi(this);

    QList<QByteArray> l=QImageReader::supportedImageFormats();

    for(int x=0;x<l.count();x++)
    {
        QByteArray i=l.at(x).toLower();
        if(!ifmts.contains(i))
            ifmts.append(i);
    }

    for(int x=0;x<ifmts.count();x++)
        iffilters.append("*."+ifmts.at(x)+" ");
    iffilters.chop(1);
    iffilters.append(")");

    for(int x=0;x<ifmts.count();x++)
        ifcmp.append("\\."+ifmts.at(x)+"$|");
    ifcmp.chop(1);

	on_btRestoreCfg_clicked();

    TT_BUTTONS
}

CSettings::~CSettings()
{
    delete ui;
}

//

bool CSettings::tipAtStartup() const
{
    return ui->cbTip->isChecked();
}

bool CSettings::trayIsChecked() const
{
    return ui->cbTray->isChecked();
}
bool CSettings::scan() const {return ui->gbScan->isChecked();}
bool CSettings::scanGk() const {return ui->cbGkSc->isChecked();}
bool CSettings::scanLat() const {return ui->cbLatSc->isChecked();}
bool CSettings::scanCop() const {return ui->cbCopSc->isChecked();}

QFont CSettings::tlgGreekFont() const
    {return ui->fntTlgGreek->currentFont();}
int CSettings::tlgGreekFontSize() const
    {return ui->spnGreekSize->value();}
QFont CSettings::tlgCopticFont() const
    {return ui->fntTlgCoptic->currentFont();}
int CSettings::tlgCopticFontSize() const
    {return ui->spnCopticSize->value();}
QFont CSettings::tlgHebrewFont() const
    {return ui->fntTlgHebrew->currentFont();}
int CSettings::tlgHebrewFontSize() const
    {return ui->spnHebrewSize->value();}

QString CSettings::border() const {return QString::number(ui->spnBorder->value());}
QString CSettings::padding() const {return QString::number(ui->spnPadding->value());}
QString CSettings::spacing() const {return QString::number(ui->spnSpacing->value());}

QString CSettings::nick() const {return ui->txtNick->text();}

QString CSettings::background() const
{return QDir::toNativeSeparators(ui->txtBkg->text());}

QString CSettings::defaultBrowser() const
{return ui->txtDefaultBrowser->text();}

bool CSettings::isLangEnglish() const
{return ui->cmbGUILang->currentIndex()==0;}

bool CSettings::isCopticEditable() const
{
    return ui->cbCopticEditable->isChecked();
}
bool CSettings::isTlgEnabled() const {return ui->cbTLG->isChecked();}

bool CSettings::copDictToolTips() const {return ui->cbToolTips->isChecked();}
bool CSettings::copDictAutoHL() const {return ui->cbHLText->isChecked();}
bool CSettings::checkMysqlIndexes() const {return ui->cbChkIndexes->isChecked();}

QString CSettings::noteStyle() const {return ui->txtNoteStyle->text();}

bool CSettings::unicodeInput() const {return ui->cbDefaultInput->isChecked();}
int CSettings::queryResultsCount() const {return ui->spnQueryLimit->value();}
bool CSettings::showEntireBook() const { return ui->rbSettingsEntire->isChecked();}
bool CSettings::showHyperlinksToConcordance() const {return ui->cbSettingsAnalysis->isChecked();}

QGroupBox * CSettings::sc()
{
    return ui->gbScan;
}

QCheckBox * CSettings::scCop()
{
    return ui->cbCopSc;
}

QCheckBox * CSettings::scLat()
{
    return ui->cbLatSc;
}

QCheckBox * CSettings::scGk()
{
    return ui->cbGkSc;
}

QCheckBox * CSettings::tray()
{
    return ui->cbTray;
}

//

QString CSettings::dir1() const
{
    return ui->txtDir1->text();
}
QString CSettings::dir2() const
{
    return ui->txtDir2->text();
}
QString CSettings::dir3() const
{
    return ui->txtDir3->text();
}

void CSettings::on_btSaveCfg_clicked()
{
        messages->MsgMsg(tr("writing \"")+_cfgfile+"\" ...");
        QFile f(_cfgfile);

        if(!f.open(QIODevice::WriteOnly))
	{
                messages->MsgErr(tr("cannot open file '")+_cfgfile+"'");
		return;
	}

        WRITETOCFG(QString::number(ui->cmbGUILang->currentIndex()))
        WRITETOCFG(ui->cmbAppFont->currentFont().family())
        WRITETOCFG(QString::number(ui->spnAppFontSize->value()))
        WRITETOCFG(QString::number((short)ui->cbAppFont->isChecked()))
        WRITETOCFG(QString::number((short)ui->rbSplashSimple->isChecked()))
        WRITETOCFG(QString::number(ui->spnIcSize->value()))
        WRITETOCFG(QString::number(ui->spnIcSizeT->value()))
        WRITETOCFG(QString::number((short)ui->cbAppFonts->isChecked()))
        WRITETOCFG(QString::number((short)ui->cbCopticEditable->isChecked()))
        WRITETOCFG(ui->txtBkg->text())
        WRITETOCFG(ui->txtDefaultBrowser->text())
        WRITETOCFG(wgetCmd())


        WRITETOCFG(ui->cmbHebrewFont->currentFont().family())
        WRITETOCFG(QString::number(ui->spnHebrewFontSize->value()))
        WRITETOCFG(ui->cmbLatinFont->currentFont().family())
        WRITETOCFG(QString::number(ui->spnLatinFontSize->value()))
        WRITETOCFG(ui->cmbCoptFont->currentFont().family())
        WRITETOCFG(QString::number(ui->spnCoptFontSize->value()))
        WRITETOCFG(ui->cmbGrkFont->currentFont().family())
        WRITETOCFG(QString::number(ui->spnGrkFontSize->value()))

        WRITETOCFG(QString::number((short)ui->cbTLG->isChecked()))
        WRITETOCFG(tlgGreekFont().family())
        WRITETOCFG(QString::number(tlgGreekFontSize()))
        WRITETOCFG(tlgCopticFont().family())
        WRITETOCFG(QString::number(tlgCopticFontSize()))
        WRITETOCFG(tlgHebrewFont().family())
        WRITETOCFG(QString::number(tlgHebrewFontSize()))
        WRITETOCFG(dir1())
        WRITETOCFG(dir2())
        WRITETOCFG(dir3())
        //WRITETOCFG(txtLibPath->text())

        /*WRITETOCFG(txtUser->text())
        WRITETOCFG(txtPwd->text())
        WRITETOCFG(txtHost->text())
        WRITETOCFG(txtPort->text())
        WRITETOCFG(txtDb->text())*/

        WRITETOCFG(border())
        WRITETOCFG(padding())
        WRITETOCFG(spacing())

        WRITETOCFG(nick())

        WRITETOCFG(HTbgColor())
        WRITETOCFG(HTfgColor())


        WRITETOCFG(bt.values())
        WRITETOCFG(br.values())
        WRITETOCFG(lsr.values())

        WRITETOCFG(swishCmd())

        WRITETOCFG(QString::number((short)ui->gbScan->isChecked()))
        WRITETOCFG(QString::number((short)ui->cbGkSc->isChecked()))
        WRITETOCFG(QString::number((short)ui->cbLatSc->isChecked()))
        WRITETOCFG(QString::number((short)ui->cbCopSc->isChecked()))
        WRITETOCFG(QString::number((short)ui->cbTray->isChecked()))
        WRITETOCFG(ui->ccPen->bgColor())
        WRITETOCFG(ui->ccFill->bgColor())
        WRITETOCFG(QString::number(ui->spnSelBorder->value()))
        WRITETOCFG(QString::number(ui->spnOpacity->value()))

        WRITETOCFG(QString::number((short)ui->cbHLText->isChecked()))
        WRITETOCFG(QString::number((short)ui->cbToolTips->isChecked()))
        WRITETOCFG(/*QString::number((short)cbChkIndexes->isChecked())*/"1")
        WRITETOCFG(ui->cchHTCDNorm->fgColor())
        WRITETOCFG(ui->cchHTCDSel->fgColor())

        WRITETOCFG(ui->txtNoteStyle->text())

        WRITETOCFG(QString::number((short)ui->cbDefaultInput->isChecked()))
        WRITETOCFG(QString::number(ui->spnQueryLimit->value()))
        WRITETOCFG(QString::number((short)ui->cbTip->isChecked()))

        WRITETOCFG(QString::number((short)ui->rbSettingsChapter->isChecked()))
        WRITETOCFG(QString::number((short)ui->cbSettingsAnalysis->isChecked()))

        f.close();
        messages->MsgOk();
        messages->MsgInf(tr("Configuration updated."));
}

void CSettings::on_btRestoreCfg_clicked()
{
    if(!QFile::exists(_cfgfile))
    {
        messages->MsgInf("'"+_cfgfile+tr("' does not exist, new one will be created."));
        QFile nf(_cfgfile);
        if(!nf.open(QIODevice::WriteOnly))
        {
                messages->MsgErr(tr("cannot open file '")+_cfgfile+tr("' for writing"));
                return;
        }
        else
        {
            if(nf.write(QString((wiz?QString::number(wiz->language()):"0")+"\n"+(wiz?wiz->appFont().family():QApplication::font().family())+"\n"+(wiz?QString::number(wiz->appFont().pointSize()):"15")+"\n"+(wiz?QString::number((short)wiz->useAppFont()):"0")+"\n"+(wiz?QString::number((short)wiz->isSimpleSplash()):"0")+"\n16\n24\n1\n0\nicons/background/theatrum.png\n(default)\n(default)\nEzra SIL\n20\nNew Athena Unicode\n15\nNew Athena Unicode\n15\nNew Athena Unicode\n15\n"+(wiz?QString::number(wiz->isTlgEnabled()):QString("0"))+"\nNew Athena Unicode\n16\nNew Athena Unicode\n16\nEzra SIL\n20\n"+(wiz?wiz->dir1():QString())+"\n"+(wiz?wiz->dir2():QString())+"\n"+(wiz?wiz->dir3():QString())+"\n1\n5\n0\nsomeone\nyellow\nblack\nleft;#878787;1;4;0\ncenter;#e7e7e7;top;#ffffff;left;black;white;none\ncenter;#848484;1;4;0;top;#e7e7e7;top;#e7e7e7;top;#e7e7e7;3;1;top\n(default)\n"+(wiz?QString::number((short)wiz->scanClipboard()):QString("0"))+"\n1\n0\n1\n"+(wiz?QString::number((short)wiz->trayIcon()):QString("1"))+"\nblack\nblack\n3\n25\n1\n1\n1\nbrown\nlightyellow\nbackground-color: lightgray; color: black; font-size: small;\n0\n50\n"+(wiz?QString::number((short)wiz->tipAtStartup()):QString("0"))+"\n").toUtf8()+"1\n1\n")==-1)
            {
                messages->MsgErr(tr("cannot write into file '")+_cfgfile+"'");
                nf.close();
                return;
            }
            nf.close();
            messages->MsgOk();
        }
    }

    messages->MsgMsg(tr("reading '")+_cfgfile+"' ...");

    QFile f(_cfgfile);
    if(!f.open(QIODevice::ReadOnly))
    {
            messages->MsgErr(tr("cannot open file '")+_cfgfile+"'");
            return;
    }

    ui->cmbGUILang->setCurrentIndex(readcfgline(f).toInt());

    QFont cf;
    cf.setFamily(readcfgline(f));
    cf.setPointSize(readcfgline(f).toInt());

    blockSignals(true);
    ui->cmbAppFont->setCurrentFont(cf);
    ui->spnAppFontSize->setValue(cf.pointSize());

    ui->cbAppFont->setChecked((bool)readcfgline(f).toShort());
    on_cbAppFont_clicked(ui->cbAppFont->isChecked());
    blockSignals(false);

    bool splash_simple((bool)readcfgline(f).toShort());
    ui->rbSplashSimple->setChecked(splash_simple);
    ui->rbSplashAnim->setChecked(!splash_simple);

    ui->spnIcSize->setValue(readcfgline(f).toShort());
    ui->spnIcSizeT->setValue(readcfgline(f).toShort());

    ui->cbAppFonts->setChecked((bool)readcfgline(f).toShort());

    if(ui->cbAppFonts->isChecked())
        loadAppFonts();

    ui->cbCopticEditable->setChecked((bool)readcfgline(f).toShort());

    ui->txtBkg->setText(readcfgline(f));
    ui->txtDefaultBrowser->setText(readcfgline(f));
    ui->txtWget->setText(readcfgline(f));

    cf.setFamily(readcfgline(f));
    cf.setPointSize(readcfgline(f).toInt());
    ui->cmbHebrewFont->setCurrentFont(cf);
    ui->spnHebrewFontSize->setValue(cf.pointSize());
    on_cmbHebrewFont_currentFontChanged(ui->cmbHebrewFont->currentFont());

    cf.setFamily(readcfgline(f));
    cf.setPointSize(readcfgline(f).toInt());
    ui->cmbLatinFont->setCurrentFont(cf);
    ui->spnLatinFontSize->setValue(cf.pointSize());
    on_cmbLatinFont_currentFontChanged(ui->cmbLatinFont->currentFont());

    cf.setFamily(readcfgline(f));
    cf.setPointSize(readcfgline(f).toInt());
    ui->cmbCoptFont->setCurrentFont(cf);
    ui->spnCoptFontSize->setValue(cf.pointSize());
    on_cmbCoptFont_currentFontChanged(ui->cmbCoptFont->currentFont());

    cf.setFamily(readcfgline(f));
    cf.setPointSize(readcfgline(f).toInt());
    ui->cmbGrkFont->setCurrentFont(cf);
    ui->spnGrkFontSize->setValue(cf.pointSize());
    on_cmbGrkFont_currentFontChanged(ui->cmbGrkFont->currentFont());

    ui->cbTLG->setChecked((bool)readcfgline(f).toShort());
    on_cbTLG_toggled(ui->cbTLG->isChecked());
    cf.setFamily(readcfgline(f));
    cf.setPointSize(readcfgline(f).toInt());
    ui->fntTlgGreek->setCurrentFont(cf);
    ui->spnGreekSize->setValue(cf.pointSize());

    cf.setFamily(readcfgline(f));
    cf.setPointSize(readcfgline(f).toInt());
    ui->fntTlgCoptic->setCurrentFont(cf);
    ui->spnCopticSize->setValue(cf.pointSize());

    cf.setFamily(readcfgline(f));
    cf.setPointSize(readcfgline(f).toInt());
    ui->fntTlgHebrew->setCurrentFont(cf);
    ui->spnHebrewSize->setValue(cf.pointSize());

    ui->txtDir1->setText(readcfgline(f));
    ui->txtDir2->setText(readcfgline(f));
    ui->txtDir3->setText(readcfgline(f));

    //txtLibPath->setText(readcfgline(f));

    /*txtUser->setText(readcfgline(f));
    txtPwd->setText(readcfgline(f));
    txtHost->setText(readcfgline(f));
    txtPort->setText(readcfgline(f));
    txtDb->setText(readcfgline(f));*/

    ui->spnBorder->setValue(readcfgline(f).toInt());
    ui->spnPadding->setValue(readcfgline(f).toInt());
    ui->spnSpacing->setValue(readcfgline(f).toInt());

    ui->txtNick->setText(readcfgline(f));

    ui->HLTextChooser->init(readcfgline(f), readcfgline(f), tr("highlighted text"));

    if(!bt.init(CTblDesigner::BookT,readcfgline(f).trimmed()))
        messages->MsgErr("'"+_cfgfile+tr("' is corrupted"));
    else
    {
        bt.createHtml();
        ui->txtLibTbl->setText(bt.html());
    }

    if(!br.init(CTblDesigner::BookR,readcfgline(f).trimmed()))
        messages->MsgErr("'"+_cfgfile+tr("' is corrupted"));
    else
    {
        br.createHtml();
        ui->txtLibVrs->setText(br.html());
    }

    if(!lsr.init(CTblDesigner::LibSearch,readcfgline(f).trimmed()))
        messages->MsgErr("'"+_cfgfile+tr("' is corrupted"));
    else
    {
        lsr.createHtml();
        ui->txtLibSResTbl->setText(lsr.html());
    }

    ui->txtSwish->setText(readcfgline(f));

    ui->gbScan->setChecked((bool)readcfgline(f).toShort());
    ui->cbGkSc->setChecked((bool)readcfgline(f).toShort());
    ui->cbLatSc->setChecked((bool)readcfgline(f).toShort());
    ui->cbCopSc->setChecked((bool)readcfgline(f).toShort());
    ui->cbTray->setChecked((bool)readcfgline(f).toShort());

    ui->ccPen->init("white",readcfgline(f),tr("border color"),CTextColorChooser::Background);
    ui->ccFill->init("white",readcfgline(f),tr("fill color"),CTextColorChooser::Background);
    ui->spnSelBorder->setValue(readcfgline(f).toInt());
    ui->spnOpacity->setValue(readcfgline(f).toInt());

    ui->cbHLText->setChecked((bool)readcfgline(f).toShort());
    ui->cbToolTips->setChecked((bool)readcfgline(f).toShort());

    readcfgline(f);
    ui->cbChkIndexes->setChecked(/*(bool)readcfgline(f).toShort()*/true);

    ui->cchHTCDNorm->init(readcfgline(f),"white","text",CTextColorChooser::Foreground);
    ui->cchHTCDSel->init(readcfgline(f),QColor(Qt::darkBlue).name(),"text",CTextColorChooser::Foreground);
    ui->txtNoteStyle->setText(readcfgline(f));

    ui->cbDefaultInput->setChecked((bool)readcfgline(f).toShort());
    ui->spnQueryLimit->setValue(readcfgline(f).toInt());
    ui->cbTip->setChecked((bool)readcfgline(f).toShort());

    bool const chapter_book=(bool)readcfgline(f).toShort();
    ui->rbSettingsChapter->setChecked(chapter_book);
    ui->rbSettingsEntire->setChecked(!chapter_book);
    ui->cbSettingsAnalysis->setChecked((bool)readcfgline(f).toShort());

    f.close();


    messages->MsgOk();
}
int CSettings::writecfgline(QFile & f, QString str)
{
    return f.write(str.toUtf8()+'\n');
        /*char s[255];
	int x;
	for(x=0;x<=str.length();x++)
		s[x]=str[x].toAscii();
	s[x]=0;
	int r=fputs(s,f);
	fputs("\n",f);
	if(r==EOF)
		return false;
	else
                return true;	*/
}
QString	CSettings::readcfgline(QFile & f) const
{
    char l[2048];
    if(f.readLine(l,2048)==0)
    {
            messages->MsgErr(tr("cannot read from file '")+f.fileName()+"'");
            return QString();
    }

    return QString::fromUtf8(l).remove('\n');
}

QString	CSettings::readcfgline_st(QFile & f)
{
    char l[2048];
    if(f.readLine(l,2048)==0)
    {
        OSTREAM << tr("cannot read from file '")+f.fileName()+"'\n";
            OSTREAM.flush();
            QMessageBox(QMessageBox::Critical,tr("load application font"),tr("cannot read from file '")+f.fileName()+"'\n",QMessageBox::Close);
            QApplication::processEvents();
            return QString();
    }

    return QString::fromUtf8(l).remove('\n');
}

QString CSettings::wgetCmd() const
{
    QString cmd(ui->txtWget->text());
    if(cmd=="(default)")
#ifdef Q_WS_WIN
            return "\"C:\\Program Files\\GnuWin32\\bin\\wget\"";
#else
            return "wget";
#endif
    else
        return cmd;
}

QString CSettings::swishCmd() const
{
    QString cmd(ui->txtSwish->text());
    if(cmd=="(default)")
#ifdef Q_WS_WIN
        return "\"C:\\SWISH-E\\bin\\swish-e\"";
#else
        return "swish-e";
#endif
    else
        return cmd;
}

QFont CSettings::appFont() const
{
    QFont f(ui->cmbAppFont->currentFont());
    f.setPointSize(appFontSize());
    return f;
}

int CSettings::appFontSize() const
{
    return ui->spnAppFontSize->value();
}

QFont CSettings::copticFont() const
{
    return _cop_font;
}
int CSettings::copticFontSize() const
{
    return _cop_font.pointSize();
}
QFont CSettings::greekFont() const
{
    return _gk_font;
}
int CSettings::greekFontSize() const
{
    return _gk_font.pointSize();
}
QFont CSettings::latinFont() const
{
    return _lat_font;
}
int CSettings::latinFontSize() const
{
    return _lat_font.pointSize();
}
QFont CSettings::hebrewFont() const
{
    return _hb_font;
}
int CSettings::hebrewFontSize() const
{
    return _hb_font.pointSize();
}

void CSettings::chooseTlgDir(QLineEdit * lineedit,QString const & caption)
{
    QFileDialog fd(this,caption,lineedit->text());
    fd.setFileMode(QFileDialog::Directory);

    if(fd.exec()==QDialog::Accepted)
        lineedit->setText(fd.selectedFiles().first());
}

void CSettings::on_btDir1_clicked()
{
    chooseTlgDir(ui->txtDir1,"TLG-E");
}

void CSettings::on_btDir2_clicked()
{
    chooseTlgDir(ui->txtDir2,"PHI-5");
}

void CSettings::on_btDir3_clicked()
{
    chooseTlgDir(ui->txtDir3,"PHI-7");
}

QFont CSettings::bFont(CTranslit::Script script) const
{
    switch(script)
    {
        case CTranslit::Copt :
        {
            return _cop_font;
            break;
        }
        case CTranslit::Greek :
        {
            return _gk_font;
            break;
        }
        case CTranslit::Latin :
        {
            return _lat_font;
            break;
        }
        case CTranslit::Hebrew :
        {
            return _hb_font;
            break;
        }
    }
    return _gk_font;
}

QFont CSettings::font(CTranslit::Script script) const
{
    switch(script)
    {
        case CTranslit::Copt :
        {
            return copticFont();
            break;
        }
        case CTranslit::Greek :
        {
            return greekFont();
            break;
        }
        case CTranslit::Latin :
        {
            return latinFont();
            break;
        }
        case CTranslit::Hebrew :
        {
            return hebrewFont();
            break;
        }
    }
    return greekFont();
}

QString CSettings::spanStringFont(QString const & text,CTranslit::Script script,int size_offset)
{
    QFont f(bFont(script));
    QString spn("<span style=\"font-family: "+f.family()+"; font-size: "+QString::number(f.pointSize()+size_offset)+"pt;\">"+text+"</span>");
    return spn;
}

/*QString CSettings::spanStringFont(CTranslit::Script script)
{
    QFont f(bFont(script));
    QString spn("font-family: "+f.family()+"; font-size: "+QString::number(f.pointSize())+"pt;");
    return spn;
}*/

int CSettings::fontSize(CTranslit::Script  script) const
{
    switch(script)
    {
        case CTranslit::Copt :
        {
            return copticFontSize();
            break;
        }
        case CTranslit::Greek :
        {
            return greekFontSize();
            break;
        }
        case CTranslit::Latin :
        {
            return latinFontSize();
            break;
        }
        case CTranslit::Hebrew :
        {
            return hebrewFontSize();
            break;
        }
    }
    return greekFontSize();
}

/*void CSettings::on_btLibPathChoose_clicked()
{
    QFileDialog fd(this,"library path",txtLibPath->text());
    fd.setAcceptMode(QFileDialog::AcceptOpen);
    fd.setFileMode(QFileDialog::DirectoryOnly);

    if(fd.exec()==QDialog::Accepted)
        txtLibPath->setText(fd.selectedFiles().first()+"/");
}*/

void CSettings::on_btAppFonts_clicked()
{
    loadAppFonts();
}

bool CSettings::loadAppFonts()
{
    messages->MsgMsg(tr("loading font 'New Athena Unicode' from file 'fonts/newathu.ttf' ..."));
    if(QFontDatabase::addApplicationFont(QDir::toNativeSeparators("fonts/newathu.ttf"))==-1)
    {
        messages->MsgErr(tr("cannot load font"));
        return false;
    }

    messages->MsgMsg(tr("loading font 'EZRA SIL' from file 'fonts/SILEOT.ttf' ..."));
    if(QFontDatabase::addApplicationFont(QDir::toNativeSeparators("fonts/SILEOT.ttf"))==-1)
    {
        messages->MsgErr(tr("cannot load font"));
        return false;
    }

    messages->MsgMsg(tr("loading font 'SP Tiberi' from file 'fonts/SPTiberi.ttf' ..."));
    if(QFontDatabase::addApplicationFont(QDir::toNativeSeparators("fonts/SPTiberi.ttf"))==-1)
    {
        messages->MsgErr(tr("cannot load font"));
        return false;
    }

    messages->MsgMsg(tr("loading font 'SP Achmim' from file 'fonts/SPAchmim.ttf' ..."));
    if(QFontDatabase::addApplicationFont(QDir::toNativeSeparators("fonts/SPAchmim.ttf"))==-1)
    {
        messages->MsgErr(tr("cannot load font"));
        return false;
    }

    messages->MsgOk();
    return true;
}

void CSettings::on_btBkg_clicked()
{
    QFileDialog fd(this,tr("background image"),QDir::toNativeSeparators("icons/background"),"all (*)");
    fd.setAcceptMode(QFileDialog::AcceptOpen);
    fd.setFileMode(QFileDialog::ExistingFile);

    if(fd.exec()==QDialog::Accepted)
    {
        if(fd.selectedFiles().count()>0)
        {
            QString f(fd.selectedFiles().first());
            ui->txtBkg->setText(f);
            loadBackground();
        }
    }
}

void CSettings::on_txtBkg_returnPressed()
{
    loadBackground();
}

void CSettings::loadBackground()
{
    if(!(*_sr_tab)->loadBackground(background()))
        m_msg()->MsgErr(tr("cannot load background image '")+background()+"'");
    (*_sr_tab)->update();
}

void CSettings::on_cbCopticEditable_clicked()
{
    emit copticEditModeChanged(ui->cbCopticEditable->isChecked());
}

void CSettings::on_cmbCoptFont_currentFontChanged(QFont f)
{
    _cop_font=f;
    _cop_font.setPointSize(ui->spnCoptFontSize->value());
    emit fontChanged(CTranslit::Copt,_cop_font);
}


void CSettings::on_spnCoptFontSize_valueChanged(int value)
{
    //_cop_font=cmbCoptFont->currentFont();
    _cop_font.setPointSize(value);
    emit fontChanged(CTranslit::Copt,_cop_font);
}

void CSettings::on_cmbLatinFont_currentFontChanged(QFont f)
{
    _lat_font=f;
    _lat_font.setPointSize(ui->spnLatinFontSize->value());
    emit fontChanged(CTranslit::Latin,_lat_font);

}

void CSettings::on_spnLatinFontSize_valueChanged(int value)
{
    //_lat_font=cmbLatinFont->currentFont();
    _lat_font.setPointSize(value);
    emit fontChanged(CTranslit::Latin,_lat_font);
}

void CSettings::on_cmbGrkFont_currentFontChanged(QFont f)
{
    _gk_font=f;
    _gk_font.setPointSize(ui->spnGrkFontSize->value());
    emit fontChanged(CTranslit::Greek,_gk_font);
}

void CSettings::on_spnGrkFontSize_valueChanged(int value)
{
    //_gk_font=cmbGrkFont->currentFont();
    _gk_font.setPointSize(value);
    emit fontChanged(CTranslit::Greek,_gk_font);
}

void CSettings::on_cmbHebrewFont_currentFontChanged(QFont f)
{
    _hb_font=f;
    _hb_font.setPointSize(ui->spnHebrewFontSize->value());
    emit fontChanged(CTranslit::Hebrew,_hb_font);
}

void CSettings::on_spnHebrewFontSize_valueChanged(int value)
{
    //_hb_font=cmbHebrewFont->currentFont();
    _hb_font.setPointSize(value);
    emit fontChanged(CTranslit::Hebrew,_hb_font);
}

QColor CSettings::HTCDNorm()
{
    return ui->cchHTCDNorm->fgC();
}

QColor CSettings::HTCDSel() const
{
    return ui->cchHTCDSel->fgC();
}

QColor CSettings::HTfgC() const
{
    return ui->HLTextChooser->fgC();
}

QColor CSettings::HTbgC() const
{
    return ui->HLTextChooser->bgC();
}

QString CSettings::HTfgColor() const
{
    return ui->HLTextChooser->fgColor();
}

QString CSettings::HTbgColor() const
{
    return ui->HLTextChooser->bgColor();
}

QString CSettings::bookTblTemplate() const
{
    return ui->txtLibTbl->text();
}

QString CSettings::bookRowTemplate() const
{
    return ui->txtLibVrs->text();
}

QString CSettings::libsearchresTblTemplate() const
{
    return ui->txtLibSResTbl->text();
}


void CSettings::on_cmbAppFont_currentFontChanged(QFont f)
{
    f.setPointSize(ui->spnAppFontSize->value());
    emit settingsChanged(AppFont);
}

void CSettings::on_spnAppFontSize_valueChanged(int newv)
{
    QFont f(ui->cmbAppFont->currentFont());
    f.setPointSize(newv);
    emit settingsChanged(AppFont);
}

bool CSettings::extraAppFont() const
{
    return ui->cbAppFont->isChecked();
}

void CSettings::on_cbAppFont_clicked(bool checked)
{
    ui->cmbAppFont->setEnabled(checked);
    ui->spnAppFontSize->setEnabled(checked);

    emit settingsChanged(AppFont);
}

bool CSettings::readAppFont(QTranslator* qtTr, int & lang,QFont & appf,bool & splash_simple,bool & interrupted)
{
    if(!QFile::exists(_cfgfile))
    {
        OSTREAM << tr("file '")+_cfgfile+tr("' does not exist, invoking wizard ...\n");
        OSTREAM.flush();

        if(!CSettings::wiz)
            CSettings::wiz=new MBuildConfig(qtTr,marcDir);
        CSettings::wiz->exec();
        interrupted=wiz->isInterrupted();

        lang=wiz->language();
        appf=wiz->appFont();
        splash_simple=wiz->isSimpleSplash();

        /*QMessageBox(QMessageBox::Warning,"load application font","'config.txt' does not exist,\nloading of extra application font skipped",QMessageBox::Close);
        QApplication::processEvents();*/
        return wiz->useAppFont();
    }

        OSTREAM << tr("reading '")+_cfgfile+"' ...\n";

        QFile f(_cfgfile);
        if(!f.open(QIODevice::ReadOnly))
        {
            OSTREAM << tr("cannot open file '")+_cfgfile+tr("', loading of extra application font skipped\n");
            OSTREAM.flush();
            QMessageBox(QMessageBox::Critical,tr("load application font"),tr("cannot open file '")+_cfgfile+tr("',\nloading of extra application font skipped"),QMessageBox::Close).exec();
            QApplication::processEvents();
            return false;
        }

        lang=readcfgline_st(f).toInt();
        QFont cf;
        cf.setFamily(readcfgline_st(f));
        cf.setPointSize(readcfgline_st(f).toInt());

        bool af=(bool)readcfgline_st(f).toShort();
        splash_simple=(bool)readcfgline_st(f).toShort();
        f.close();
        appf=cf;
        return af;
}

void CSettings::on_btTblD1_clicked()
{
    if(bt.exec()==QDialog::Accepted)
        ui->txtLibTbl->setText(bt.html());
}

void CSettings::on_btTblD2_clicked()
{
    if(br.exec()==QDialog::Accepted)
        ui->txtLibVrs->setText(br.html());
}

void CSettings::on_btTblD2_2_clicked()
{
    if(lsr.exec()==QDialog::Accepted)
        ui->txtLibSResTbl->setText(lsr.html());
}

void CSettings::on_btChooseWget_clicked()
{
    QFileDialog d(this,tr("wget executable"));
    d.setFileMode(QFileDialog::ExistingFile);
    //d.setFilter(QDir::Executable);
    if(d.exec()==QDialog::Accepted)
    {
        if(d.selectedFiles().count()>0)
            ui->txtWget->setText(QString("\""+d.selectedFiles().first()+"\""));
    }
}

void CSettings::on_btChooseSwish_clicked()
{
    QFileDialog d(this,tr("swish-e executable"));
    d.setFileMode(QFileDialog::ExistingFile);
    //d.setFilter(QDir::Executable);
    if(d.exec()==QDialog::Accepted)
    {
        if(d.selectedFiles().count()>0)
            ui->txtSwish->setText(QString("\""+d.selectedFiles().first()+"\""));
    }
}

void CSettings::on_btBrowser_clicked()
{
    QFileDialog d(this,tr("default web browser"));
    d.setFileMode(QFileDialog::ExistingFile);
    //d.setFilter(QDir::Executable);
    if(d.exec()==QDialog::Accepted)
    {
        if(d.selectedFiles().count()>0)
        {
            ui->txtDefaultBrowser->setText(QString("\""+d.selectedFiles().first()+"\""));
        }
    }
}

QSize CSettings::iconsSize(bool toolbars) const
{
    int s=(toolbars?ui->spnIcSizeT->value():ui->spnIcSize->value());
    return QSize(s,s);
}

void CSettings::setIcSizes(QWidget const & widget,int size) const
{
    QList<QAbstractButton*> wl(widget.findChildren<QAbstractButton*>());

    QSize s(size==0?iconsSize(false):QSize(size,size));
    QAbstractButton * b;
    foreach(b,wl)
        b->setIconSize(s);
}

void CSettings::updButtonToolTips(QWidget const & widget) const
{
    QList<QAbstractButton*> wl(widget.findChildren<QAbstractButton*>());

    QAbstractButton * b;
    foreach(b,wl)
    {
        QString const sh(b->shortcut().toString()),
                tt(b->toolTip());
        if(!sh.isEmpty()&&!tt.endsWith(sh))
        {
            if(tt.isEmpty())
                b->setToolTip(sh);
            else
                b->setToolTip(tt+" | "+sh);
        }
    }
}

void CSettings::on_btUseIcSize_clicked()
{
    emit resizeIcons(false);
}

void CSettings::on_btUseIcSizeT_clicked()
{
    emit resizeIcons(true);
}

void CSettings::on_btDefaults_clicked()
{
    if(wiz)
    {
        delete wiz;
        wiz=0;
    }
    _cfgfile=QString("config-defaults.txt");
    on_btRestoreCfg_clicked();
    _cfgfile=QString("config.txt");
}

void CSettings::on_btDefBr_clicked()
{
    ui->txtDefaultBrowser->setText("(default)");
}

void CSettings::execBrowser(QUrl const & url)
{
    QString browser(ui->txtDefaultBrowser->text());
    if(browser=="(default)")
    {
        messages->MsgMsg(tr("opening ")+url.toString()+tr(" in default browser ..."));
        QDesktopServices::openUrl(url);
    }
    else
    {
        QString cmd(browser+" "+url.toString());
        QProcess * p=new QProcess();
        messages->MsgMsg(tr("executing command '")+url.toString()+"' ...");
        p->start(cmd);
    }
}

QIcon CSettings::iconForFilename(QString const & filename)
{
    if(filename.endsWith(".ilt.html",Qt::CaseInsensitive))
        return QIcon(":/new/icons/icons/html_file.png");
    else if(filename.endsWith(".htm",Qt::CaseInsensitive)||filename.endsWith(".html",Qt::CaseInsensitive))
        return QIcon(":/new/icons/icons/html_file.png");
    else if(filename.endsWith(".djvu",Qt::CaseInsensitive))
        return QIcon(":/new/icons/icons/djvu_icon.png");
    else if(filename.endsWith(".pdf",Qt::CaseInsensitive))
        return QIcon(":/new/icons/icons/pdf_icon.png");
    else if(filename.indexOf(m_sett()->imageFormatsRegExp())!=-1)
        return QIcon(":/new/icons/icons/image.png");
    else
        return QIcon(":/new/icons/icons/txt_file.png");
}

// MClean

bool prevent_close(false);

bool & preventClose()
{
    return prevent_close;
}

MClean::MClean()
    : _cursor(false)
{

}

/*MClean::MClean(QFile * const file)
    : _cursor(false),_file(file)
{

}*/

MClean::~MClean()
{
    if(_cursor)
        QApplication::restoreOverrideCursor();
    /*if(_file)
        if(_file->isOpen())
            _file->close();*/
}

void MClean::setWaitCursor()
{
    if(!_cursor)
    {
        QApplication::setOverrideCursor(Qt::WaitCursor);
        _cursor=true;
    }
}

void MClean::setBusyCursor()
{
    if(!_cursor)
    {
        QApplication::setOverrideCursor(Qt::BusyCursor);
        _cursor=true;
    }
}


void CSettings::on_cbTLG_toggled(bool checked)
{
    ui->wdgTLG->setEnabled(checked);
}

int CSettings::imgSelBorderWidth() const
{
    return ui->spnSelBorder->value();
}

int CSettings::imgSelFillOpacity() const
{
    return ui->spnOpacity->value();
}

QColor CSettings::imgSelBorderColor() const
{
    return ui->ccPen->bgC();
}

QColor CSettings::imgSelFillColor() const
{
    return ui->ccFill->bgC();
}

QString CSettings::tmpDir() const
{
    return _tmpDir;
}

/*bool CSettings::parseNote(QString & text,QString & note)
{
    QRegExp r("\\[note\\].*\\[endnote\\]");
    r.setMinimal(true);

    int p=r.indexIn(text);
    bool const b(p!=-1);
    if(b)
    {
        QString n(r.cap());
        text.remove(QRegExp("\\[note\\].*$"));
        n.remove(QRegExp("\\[note\\]"));
        n.remove(QRegExp("\\[endnote\\]"));

        note=n;
    }

    return b;
}*/

// MFileItem

MFileItem::MFileItem(QString const & filename) :
    _type(Html),
    _filename(filename),
    _book(0),_chapter(0),_verse(0),_script(0)
{
}

MFileItem::MFileItem(QString const & text,unsigned int book,unsigned int chapter,unsigned int verse,unsigned int script) :
    _type(MySql),
    _filename(text),
    _book(book),
    _chapter(chapter),
    _verse(verse),
    _script(script)
{
}

MFileItem::MFileItem(MFileItem const & other) :
    _type(other._type),
    _filename(other._filename),
    _book(other._book),
    _chapter(other._chapter),
    _verse(other._verse),
    _script(other._script)
{
}

MFileItem & MFileItem::operator=(MFileItem const & other)
{
    _type=other._type;
    _filename=other._filename;
    _book=other._book;
    _chapter=other._chapter;
    _verse=other._verse;
    _script=other._script;

    return *this;
}

bool MFileItem::operator==(MFileItem const & other)
{
    return (QString::compare(_filename,other._filename)==0&&
            _book== other._book&&
            _chapter== other._chapter&&
            _verse== other._verse&&
            _script== other._script&&
            _type== other._type);
}

// MListFileItem

MListFileItem::MListFileItem() :
    QList<MFileItem>(),
    rec_menu(0)
{
}

MListFileItem::~MListFileItem()
{
    /*if(rec_menu)
        delete rec_menu;*/
}

void MListFileItem::prependFileItem(MFileItem const & item,bool append)
{
    int index=QList<MFileItem>::indexOf(item);
    if(index!=-1)
        QList<MFileItem>::removeAt(index);

    if(append)
        QList<MFileItem>::append(item);
    else
        QList<MFileItem>::prepend(item);
}

void MListFileItem::initMenu()
{
    if(!rec_menu)
        rec_menu=new QMenu(QObject::tr("recent files"));
}

void MListFileItem::deleteMenu()
{
    if(rec_menu)
        delete rec_menu;
}

void MListFileItem::buildMenu(const QObject * receiver, const char * member,const char * member_clear)
{
    rec_menu->clear();
    if(QList<MFileItem>::count()>0)
    {
        for(int x=0;x<QList<MFileItem>::count();x++)
        {
            QAction * a;
            MFileItem const & fiit(QList<MFileItem>::at(x));
            if(fiit._type==MFileItem::Html)
                a=rec_menu->addAction(CSettings::iconForFilename(fiit._filename),fiit._filename,receiver,member);
            else
                a=rec_menu->addAction(QIcon(":/new/icons/icons/book2.png"),QList<MFileItem>::at(x)._filename,receiver,member);
            a->setData(QVariant::fromValue(x));
        }
        rec_menu->addSeparator();
        rec_menu->addAction(QObject::tr("clear list"),receiver,member_clear);
    }
    else
    {
        QAction * a=rec_menu->addAction(QObject::tr("(list is empty)"));
        a->setEnabled(false);
    }
}

// RtfTextDelegate

RtfTextDelegate::RtfTextDelegate(int indent,bool coptic,QObject * parent)
    : QStyledItemDelegate(parent),
      exp(),
      indent(indent),
      cmode(QRegExp::CaretAtZero),
      _coptic(coptic)
{
}

void RtfTextDelegate::drawText(QPainter * painter,QString const & text,QRectF const & rect,QColor spec_color,int flags) const
{
    QString t(text);
    QRectF rf(rect);
    painter->save();
    if(!exp.isEmpty())
    {
        int p(0); QString ms;
        p=exp.indexIn(t,0,cmode);
        new_match:
        ms=exp.cap(0);
        if(_coptic&&ms.contains(QRegExp("(\\,| \\()")))
        {
            p=exp.indexIn(t,p+1,cmode);
            goto new_match;
        }

        if(p!=-1&&exp.matchedLength()>0)
        {
            QString t1,t2,t3;
            QRectF rf2;
            next_parse:
            t1=t.left(p);
            t2=ms;
            t3=t.mid(t1.length()+ms.length());

            if(!t1.isEmpty())
            {
                painter->drawText(rf,flags,t1,&rf2);
                rf.setLeft(rf.left()+rf2.width()+1);
                if(rf.width()<=0)
                    goto finish;
            }

            if(!t2.isEmpty())
            {
                QFont f(painter->font());
                f.setBold(true);
                painter->save();
                painter->setFont(f);
                painter->setPen(QPen(spec_color));
                painter->drawText(rf,flags,t2,&rf2);
                painter->restore();
                rf.setLeft(rf.left()+rf2.width()+1);
                if(rf.width()<=0)
                    goto finish;
            }

            if(!t3.isEmpty())
            {
                p=exp.indexIn(t3,0,cmode);
                new_match2:
                ms=exp.cap(0);
                if(_coptic&&ms.contains(QRegExp("(\\,| \\()")))
                {
                    p=exp.indexIn(t3,p+1,cmode);
                    goto new_match2;
                }

                if(p!=-1&&exp.matchedLength()>0)
                {
                    t=t3;
                    goto next_parse;
                }
                else
                    painter->drawText(rf,flags,t3);
            }
        }
        else
            painter->drawText(rf,flags,t);
    }
    else
        painter->drawText(rf,flags,t);
    finish:
    painter->restore();
}

void RtfTextDelegate::paint(QPainter * painter, const QStyleOptionViewItem & option, const QModelIndex & index) const
{
    QString t(index.data(Qt::DisplayRole).toString());
    QIcon icon(index.data(Qt::DecorationRole).value<QIcon>());

    QRect r(option.rect);
    if(r.isValid()&&painter)
    {
        painter->save();
        painter->setFont(option.font);

        QRectF const rf_def(r);
        QColor spec_color;
        if(option.state&QStyle::State_Selected)
        {
            QBrush brush(Qt::darkBlue,Qt::SolidPattern);
            painter->fillRect(rf_def,brush);
            spec_color=m_sett()->HTCDSel();
            painter->setPen(QPen(QColor(Qt::white)));
        }
        else
        {
            QBrush brush(Qt::white,Qt::SolidPattern);
            painter->fillRect(rf_def,brush);
            spec_color=m_sett()->HTCDNorm();
            painter->setPen(QPen(QColor(Qt::black)));
        }

        QRectF rf(rf_def);
        rf.setLeft(rf.left()+indent);

        if(!icon.isNull())
        {
            int const iconside(rf.height());
            painter->drawPixmap(rf.topLeft(),icon.pixmap(QSize(iconside,iconside),QIcon::Normal,QIcon::On));
            rf.setLeft(rf.left()+iconside);
        }

        drawText(painter,t,rf,spec_color,Qt::AlignLeft|Qt::AlignVCenter|Qt::TextSingleLine);

        painter->restore();
    }
}

void RtfTextDelegate::setRExp(QRegExp const & expression)
{
    exp=expression;
    exp.setPattern("("+exp.pattern()+"|"+exp.pattern().remove(' ')+")");
}

void RtfTextDelegate::setCaretMode(QRegExp::CaretMode caret_mode)
{
    cmode=caret_mode;
}

// MButtonMenu

MButtonMenu::MButtonMenu(QString const & title) :
    QMenu(title),
    _button(0)
{
    connect(this,SIGNAL(aboutToHide()),this,SLOT(slot_aboutToHide()));
}

void MButtonMenu::setButton(QAbstractButton * button)
{
    _button=button;
}

void MButtonMenu::slot_aboutToHide()
{
    if(_button)
    {
        _button->setChecked(false);
        _button=0;
    }
}

QAction * MButtonMenu::exec()
{
    if(_button&&_button->isChecked())
        return QMenu::exec(movePopupMenu(_button,this));

    return QMenu::exec(QCursor::pos());
}

QPoint MButtonMenu::movePopupMenu(QWidget * widget,QMenu * menu)
{
    QRect const desktop_size(QApplication::desktop()->screenGeometry());
    int const h(widget->frameSize().height()),
            hm(menu->sizeHint().height());
    QPoint p(widget->mapToGlobal(QPoint(0,h)));

    if(desktop_size.isValid()&&p.y()+hm>desktop_size.height())
    {
        int const npy(p.y()-h-hm);
        if(npy>=0)
            p.setY(npy);
    }

    return p;
}
