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

#include "translat.h"
#include "ui_translat.h"

QString CTranslat::tmpl_inf_cz(QString::fromUtf8("<table style=\"text-align: left; width: 100%;\" border=\"0\" cellpadding=\"0\"cellspacing=\"0\"><tbody><tr><td bgcolor=\"lightgray\" style=\"text-align: center; vertical-align: middle;\">Tento dokument byl vytvořen pomocí aplikace Marcion 1.8.<br><br>Home Page<br><a href=\"http://marcion.sourceforge.net/\">http://marcion.sourceforge.net/</a><br><br>download<br><a href=\"http://sourceforge.net/projects/marcion/\">http://sourceforge.net/projects/marcion/</a><br></td></tr></tbody></table>"));

QString CTranslat::tmpl_inf_en(QString::fromUtf8("<table style=\"text-align: left; width: 100%;\" border=\"0\" cellpadding=\"0\"cellspacing=\"0\"><tbody><tr><td bgcolor=\"lightgray\" style=\"text-align: center; vertical-align: middle;\">This document was created by Marcion 1.8 application.<br><br>Home Page<br><a href=\"http://marcion.sourceforge.net/\">http://marcion.sourceforge.net/</a><br><br>download<br><a href=\"http://sourceforge.net/projects/marcion/\">http://sourceforge.net/projects/marcion/</a><br></td></tr></tbody></table>"));

/*QString CTranslat::tmpl_header1(QString::fromUtf8("<div style=\"text-align: center; font-family: (*cfontf*);\"><b>ⲡⲉⲧⲉⲟⲩⲛ ⲙⲁⲁϫⲉ ⲙⲙⲟϥ ⲉⲥⲱⲧⲙ ⲙⲁⲣⲉϥⲥⲱⲧⲙ</b></div>"));

QString CTranslat::tmpl_header2(QString::fromUtf8("<div style=\"text-align: center; font-family: (*cfontf*);\"><b>ϥⲥϩⲟⲩⲟⲣⲧ ⲛϭⲓ ⲟⲩⲟⲛ ⲛⲓⲙ ⲉⲧⲛⲁϯ ⲛⲁⲓ ϩⲁ ⲟⲩⲇⲱⲣⲟⲛ ⲏ ⲉⲧⲃⲉ ⲟⲩϩⲛⲉⲟⲩⲱⲙ ⲏ ⲉⲧⲃⲉ ⲟⲩⲥⲱ ⲏ ⲉⲧⲃⲉ ⲟⲩϣⲧⲏⲛ ⲏ ⲉⲧⲃⲉ ⲕⲉ ϩⲱⲃ ⲛⲧⲉⲓⲙⲉⲓⲛⲉ</b></div>"));*/

QString CTranslat::tmpl2("<p>(*text*)</p>");

QString CTranslat::tmpl1("<!DOCTYPE HTML PUBLIC \"-//W3C//DTD HTML 4.01 Transitional//EN\">\n<html><head><meta http-equiv=\"Content-Type\" content=\"text/html;charset=UTF-8\">  <meta http-equiv=\"Content-Language\" content=\"(*lang*)\"><meta name=\"robots\" content=\"(*robots*)\"><link rel=\"shortcut icon\" href=\"../pics/marc.ico\"><title>(*title*)</title></head><body style=\"font-family: (*cfontf*);\"><p align=\"center\"><a href=\"../\">Home</a></p><hr><div>(*inf*)</div><br>(*about*)<ul>\n<li><a href=\"#enttransl\">translation</a></li>\n<li><a href=\"#transl\">interlinear</a></li>\n<li><a href=\"#text\">coptic text</a></li>\n</ul><br><div><a name=\"enttransl\"></a><h2>translation</h2>(*enttr*)</div><br><div><a name=\"transl\"></a><h2>interlinear translation</h2>(*entintr*)</div><br><div><a name=\"text\"></a><h2>coptic text</h2>(*enttxt*)</div><hr><p align=\"center\"><a href=\"../\">Home</a></p></body></html>");

QString CTranslat::tmpl1_simple("<!DOCTYPE HTML PUBLIC \"-//W3C//DTD HTML 4.01 Transitional//EN\">\n<html><head><meta http-equiv=\"Content-Type\" content=\"text/html;charset=UTF-8\">  <meta http-equiv=\"Content-Language\" content=\"(*lang*)\"><meta name=\"robots\" content=\"(*robots*)\"><link rel=\"shortcut icon\" href=\"../pics/marc.ico\"><title>(*title*)</title></head><body style=\"font-family: (*cfontf*);\"><p align=\"center\"><a href=\"../\">Home</a></p><hr><div>(*inf*)</div><br>(*about*)<p align=\"center\"><a href=\"./\">interlinear translation</a></p><h2 align=\"center\">translation from Coptic language</h2><div><table><tbody>(*enttr*)</tbody></table></div><hr><div>(*comment*)</div><hr><p align=\"center\"><a href=\"../\">Home</a></p></body></html>");

CTranslat::CTranslat(CMessages * const messages,QString const & filename,bool verbose,QWidget *parent) :
    QWidget(parent),
    ui(new Ui::CTranslat),
    messages(messages),
    filename(filename),
    cut_id(-1),
    coptdic(0),gdic(0),gramm(0),
    clipb(),
    ed(),
    changed(false)
{
    ui->setupUi(this);

    QFont cf(messages->settings().font(CTranslit::Copt));
    cf.setPointSize(messages->settings().fontSize(CTranslit::Copt));
    QFont lf(messages->settings().font(CTranslit::Latin));
    lf.setPointSize(messages->settings().fontSize(CTranslit::Latin));

    slot_fontChanged(CTranslit::Copt,cf);
    slot_fontChanged(CTranslit::Latin,lf);

    connect(&messages->settings(),SIGNAL(fontChanged(CTranslit::Script,QFont)),this,SLOT(slot_fontChanged(CTranslit::Script,QFont)));

    if(!filename.isEmpty())
    {
        if(!loadILTFile(verbose))
            CTranslat::filename.append(".INCOMPLETE");
    }
    else
    {
        ui->txtTitle->setText("<english></english><czech></czech>");
        ui->txtAbout->setPlainText("<english>\n</english>\n<czech>\n</czech>");
    }

    setWindowTitle(QFileInfo(CTranslat::filename).fileName());

    IC_SIZES
}

CTranslat::~CTranslat()
{
    if(coptdic)
        delete coptdic;
    if(gdic)
        delete gdic;
    if(gramm)
        delete gramm;

    delete ui;
}

void CTranslat::keyPressEvent(QKeyEvent * event)
{
    event->ignore();

    QWidget * w=ui->stwItems->currentWidget();
    if(w)
        ((CIntLinTr*)w)->keyPressEvent(event);

    if(!event->isAccepted())
        QWidget::keyPressEvent(event);
}

void CTranslat::changeEvent(QEvent *e)
{
    QWidget::changeEvent(e);
    switch (e->type()) {
    case QEvent::LanguageChange:
        ui->retranslateUi(this);
        break;
    default:
        break;
    }
}

void CTranslat::closeEvent ( QCloseEvent * closeEvent )
{
    if(changed)
    {
        QMessageBox mb(QMessageBox::Warning,tr("unsaved file"),QString(tr("File '")+filename+tr("' has unsaved changes!")),QMessageBox::Abort|QMessageBox::Save|QMessageBox::Discard,this);
        switch(mb.exec())
        {
        case QMessageBox::Save :
            saveILTFile();
            closeEvent->accept();
            break;
        case QMessageBox::Discard :
            closeEvent->accept();
            break;
        case QMessageBox::Abort :
            preventClose()=true;
            closeEvent->ignore();
            break;
        }
    }
}

CIntLinTr * CTranslat::newItem() const
{
    CIntLinTr * ilt(new CIntLinTr(messages,true));

    QFont cf(messages->settings().font(CTranslit::Copt));
    cf.setPointSize(messages->settings().fontSize(CTranslit::Copt));

    QFont lf(messages->settings().font(CTranslit::Latin));
    lf.setPointSize(messages->settings().fontSize(CTranslit::Latin));

    ilt->setFonts(cf,lf);

    connect(ilt,SIGNAL(dictionaryRequested(short,int,QString)),this,SLOT(slot_dictionaryRequested(short,int,QString)));
    connect(ilt,SIGNAL(grammarRequested(QString)),this,SLOT(slot_grammarRequested(QString)));
    connect(ilt,SIGNAL(clipboardData(QStringList*,bool)),this,SLOT(slot_clipboardData(QStringList*,bool)));

    return ilt;
}

CIntLinTr * CTranslat::appendItem()
{
    ui->cmbItems->addItem(QString::number(ui->cmbItems->count()+1));
    CIntLinTr * ni=newItem();
    ui->stwItems->addWidget(ni);
    slot_fileChanged();
    watchItem(ni);
    return ni;
}

void CTranslat::on_btAppend_clicked()
{
    appendItem();
}

void CTranslat::saveILTFile()
{
    if(!filename.isEmpty())
    {
        USE_CLEAN_WAIT
        QFile f(filename);
        messages->MsgMsg(tr("writing file '")+filename+"' ...");
        if(!f.open(QIODevice::WriteOnly))
        {
            messages->MsgErr(tr("cannot open file '")+filename+tr("' for writing"));

            return;
        }
        else
        {
            QString wtxt;

            wtxt.append("<ptitle>");
            wtxt.append(ui->txtTitle->text().trimmed());
            wtxt.append("</ptitle>");

            wtxt.append("<info>");
            wtxt.append(ui->txtAbout->toPlainText());
            wtxt.append("</info>");

            wtxt.append("<enttext>");
            wtxt.append(ui->txtEntireText->toPlainText());
            wtxt.append("</enttext>");

            wtxt.append("<enttr>");
            wtxt.append(ui->txtEntireTr->toPlainText());
            wtxt.append("</enttr>");

            if(f.write(wtxt.toUtf8())==-1)
            {
                messages->MsgErr(tr("cannot write into file '")+filename+"'");
                f.close();

                return;
            }

            for(int x=0;x<ui->stwItems->count();x++)
            {
                if(f.write(((CIntLinTr*)(ui->stwItems->widget(x)))->asString().toUtf8())==-1)
                {
                    messages->MsgErr(tr("cannot write into file '")+filename+"'");
                    f.close();

                    return;
                }
            }

            f.close();

            messages->MsgInf(tr("file '")+filename+tr("' saved"));
            messages->MsgOk();
            fileSaved();
        }
    }
    else
        on_btSaveAs_clicked();
}

void CTranslat::on_btSave_clicked()
{
    saveILTFile();
}

void CTranslat::on_btSaveAs_clicked()
{
    QFileDialog fd(this,tr("save document"),QDir::toNativeSeparators("data/save"),"*.ilt");
    fd.setAcceptMode(QFileDialog::AcceptSave);
    fd.setFileMode(QFileDialog::AnyFile);
    fd.setDefaultSuffix("ilt");

    if(fd.exec()==QDialog::Accepted)
    {
        if(fd.selectedFiles().count()>0)
        {
            filename=fd.selectedFiles().first();
            saveILTFile();
            setWindowTitle(QFileInfo(filename).fileName());
            setWindowIcon(QIcon(":/new/icons/icons/ilt.png"));
        }
    }
}

bool CTranslat::loadILTFile(bool verbose)
{
    QFile f(filename);
    if(!f.open(QIODevice::ReadOnly))
    {
        messages->MsgErr(tr("cannot open file '")+filename+tr("' for reading"));
        fileSaved();
        return false;
    }
    else
    {
        QString fn(QFileInfo(filename).fileName());
        setWindowTitle(fn);
        CProgressDialog pd(this);
        USE_CLEAN_WAIT

        QTime starttime;
        starttime.start();

        QString allfile((QString::fromUtf8(f.readAll())).trimmed());
        f.close();

        QRegExp fpart("^.*</enttr>");
        fpart.setMinimal(true);

        if(fpart.indexIn(allfile)==-1)
        {
            messages->MsgErr(tr("data corrupted - file: '")+filename+"'");
            if(verbose)
                pd.close();
            fileSaved();

            return false;
        }

        QString fptxt(fpart.cap(0));
        QRegExp tit("<ptitle>.*</ptitle>");
        QRegExp b1("<info>.*</info>");
        QRegExp b2("<enttext>.*</enttext>");
        QRegExp b3("<enttr>.*</enttr>");
        tit.setMinimal(true);
        b1.setMinimal(true);
        b2.setMinimal(true);
        b3.setMinimal(true);

        if(tit.indexIn(fptxt)==-1)
        {
            messages->MsgErr(tr("data corrupted - file: '")+filename+"'");
            if(verbose)
                pd.close();
            fileSaved();

            return false;
        }
        ui->txtTitle->setText(tit.cap(0).remove(QRegExp("^<ptitle>")).remove(QRegExp("</ptitle>$")));

        if(b1.indexIn(fptxt)==-1)
        {
            messages->MsgErr(tr("data corrupted - file: '")+filename+"'");
            if(verbose)
                pd.close();
            fileSaved();

            return false;
        }
        ui->txtAbout->setPlainText(b1.cap(0).remove(QRegExp("^<info>")).remove(QRegExp("</info>$")));

        if(b2.indexIn(fptxt)==-1)
        {
            messages->MsgErr(tr("data corrupted - file: '")+filename+"'");
            if(verbose)
                pd.close();
            fileSaved();

            return false;
        }
        ui->txtEntireText->setPlainText(b2.cap(0).remove(QRegExp("^<enttext>")).remove(QRegExp("</enttext>$")));

        if(b3.indexIn(fptxt)==-1)
        {
            messages->MsgErr(tr("data corrupted - file: '")+filename+"'");
            if(verbose)
                pd.close();
            fileSaved();

            return false;
        }
        ui->txtEntireTr->setPlainText(b3.cap(0).remove(QRegExp("^<enttr>")).remove(QRegExp("</enttr>$")));

        allfile.remove(fpart);

        allfile.remove(QRegExp("<block>$"));
        allfile.remove(QRegExp("<block>\n$"));
        allfile.replace("<sep>\n","<sep>");
        allfile.replace("<isep>\n","<isep>");
        allfile.replace("<isepext>\n","<isepext>");
        allfile.replace("<block>\n","<block>");


        if(!allfile.trimmed().isEmpty())
        {
            QStringList sl(allfile.split("<block>",QString::KeepEmptyParts));

            if(verbose)
            {
                messages->MsgMsg(tr("blocks: ")+QString::number(sl.count()));
                pd.initProgress(tr("processing file ..."),sl.count());
                pd.show();
            }
            for(int x=0;x<sl.count();x++)
            {
                ui->cmbItems->addItem(QString::number(x+1));
                if(verbose)
                    pd.incProgress();
                else
                    pd.processEvents();
                CIntLinTr * intl=newItem();

                QStringList sl2(sl[x].split("<sep>",QString::KeepEmptyParts));
                if(sl2.count()==6)
                {
                    QString prp(sl2[0].trimmed());
                    intl->setPrep(prp);
                    intl->setRaw(sl2[1].trimmed());
                    intl->setFinal(sl2[4].trimmed());
                    intl->setApp(sl2[5].trimmed());

                    QString cline(sl2[2].trimmed());
                    if(!cline.isEmpty())
                    {
                        QStringList sl3(cline.split("<isep>",QString::KeepEmptyParts));
                        if(sl3.count()%3==0)
                        {
                            int columns(sl3.count()/3);
                            if(verbose)
                                messages->MsgMsg(tr("block: ")+QString::number(x)+tr(", words: ")+QString::number(columns));
                            intl->initTbl(columns);
                            for(int z=0;z<columns;z++)
                            {
                                intl->setTbl(z,sl3[(z*3)],sl3[(z*3)+1],sl3[(z*3)+2],false);
                                if(verbose)
                                    pd.processEvents();
                            }
                            intl->finalizeTbl();
                        }
                        else
                        {
                            messages->MsgErr(tr("data corrupted - file: '")+filename+tr("', item: ")+prp+" err 1");
                            if(verbose)
                                pd.close();
                            fileSaved();

                            return false;
                        }
                    }

                    QString cline2(sl2[3].trimmed());
                    if(!cline2.isEmpty())
                    {
                        QStringList sl3(cline2.split("<isep>",QString::KeepEmptyParts));
                        if(sl3.count()%3==0)
                        {
                            int columns(sl3.count()/3);
                            if(verbose)
                                messages->MsgMsg(tr("block: ")+QString::number(x)+tr(", extra words: ")+QString::number(columns));
                            for(int z=0;z<columns;z++)
                            {
                                QString cw(sl3[z*3]);
                                QStringList cwl(cw.split("#",QString::KeepEmptyParts));
                                if(cwl.count()!=3)
                                {
                                    messages->MsgErr(tr("data corrupted - file: '")+filename+tr("', item: ")+prp+" "+cw+" err 2");
                                    if(verbose)
                                        pd.close();
                                    fileSaved();

                                    return false;
                                }
                                cw=cwl[0];
                                int col=cwl[1].toInt(),extend=cwl[2].toInt();
                                intl->setTbl(col,cw,sl3[(z*3)+1],sl3[(z*3)+2],true,extend);
                            }
                            intl->finalizeTbl();

                        }
                        else
                        {
                            messages->MsgErr(tr("data corrupted - file: '")+filename+tr("', item: ")+prp+" err 3");
                            if(verbose)
                                pd.close();
                            fileSaved();

                            return false;
                        }
                    }

                    watchItem(intl);
                    ui->stwItems->addWidget(intl);
                }
                else
                {
                    messages->MsgErr(tr("data corrupted - file: '")+filename+"'");
                    fileSaved();

                    return false;
                }
                if(verbose)
                    if(pd.stopped())
                    {
                        pd.close();
                        messages->MsgInf(tr("progress interrupted"));
                        fileSaved();

                        return false;
                    }
            }
        }

        QTime fintime(0,0,0,0);
        fintime=fintime.addMSecs(starttime.elapsed());
        messages->MsgMsg(tr("file loaded (")+fintime.toString("HH:mm:ss")+"): "+fn,true);
        //messages->MsgMsg("file loaded ("+QString::number(starttime.elapsed())+"): "+fn,true);
    }

    messages->MsgOk();
    fileSaved();
    return true;
}

void CTranslat::on_cmbItems_currentIndexChanged(int index)
{
    ui->stwItems->setCurrentIndex(index);
}

void CTranslat::on_btFirst_clicked()
{
    if(ui->cmbItems->count()!=-1)
        ui->cmbItems->setCurrentIndex(0);
}

void CTranslat::on_btPrev_clicked()
{
    int ci(ui->cmbItems->currentIndex());
    if(ui->cmbItems->count()!=-1)
        if((ci-1)>=0)
            ui->cmbItems->setCurrentIndex(ci-1);
}

void CTranslat::on_btNext_clicked()
{
    int ci(ui->cmbItems->currentIndex());
    if(ui->cmbItems->count()!=-1)
        if((ci+1)<=(ui->cmbItems->count()-1))
            ui->cmbItems->setCurrentIndex(ci+1);
}

void CTranslat::on_btLast_clicked()
{
    if(ui->cmbItems->count()!=-1)
        ui->cmbItems->setCurrentIndex(ui->cmbItems->count()-1);
}

int CTranslat::removeCurrentItem()
{
    if(ui->stwItems->count()>0)
    {
        ui->stwItems->removeWidget(ui->stwItems->currentWidget());
        ui->cmbItems->removeItem(ui->cmbItems->count()-1);
        stornoCut();
        slot_fileChanged();
    }
    return ui->stwItems->count();
}

void CTranslat::removeToEnd()
{
    int c(ui->stwItems->count());
    if(c>0)
    {
        int const w(ui->stwItems->currentIndex());
        if(w!=-1)
        {
            QMessageBox mb(QMessageBox::Question,tr("deleting items"),tr("continue?"),QMessageBox::Yes|QMessageBox::No,this);
            if(mb.exec()==QMessageBox::Yes)
            {
                QList<QWidget*> lw;
                for(int x=w;x<ui->stwItems->count();x++)
                    lw.append(ui->stwItems->widget(x));
                for(int x=0;x<lw.count();x++)
                {
                    ui->stwItems->removeWidget(lw[x]);
                    ui->cmbItems->removeItem(ui->cmbItems->count()-1);
                }
                stornoCut();
                slot_fileChanged();
            }
        }
    }
}

void CTranslat::on_btDel_clicked()
{
    switch(ui->cmbDel->currentIndex())
    {
    case 0 :
        removeCurrentItem();
        break;
    case 1 :
        removeToEnd();
        break;
    case 2 :
        clearInter();
        break;
    }
}

void CTranslat::on_btCut_clicked(bool checked)
{
    if(checked)
    {
        int ci(ui->stwItems->currentIndex());
        if(ci!=-1)
            cut_id=ui->stwItems->currentIndex();
        else
            ui->btCut->setChecked(false);
    }
    else
        cut_id=-1;
}

void CTranslat::on_btPaste_clicked()
{
    if(cut_id>-1)
    {
        if(ui->stwItems->currentIndex()!=-1&&ui->cmbItems->currentIndex()!=-1)
        {
            ui->stwItems->insertWidget(ui->stwItems->currentIndex(),ui->stwItems->widget(cut_id));
            ui->stwItems->setCurrentIndex(ui->cmbItems->currentIndex());
        }
        stornoCut();
        slot_fileChanged();
    }
}

void CTranslat::on_btInsert_clicked()
{
    if(ui->stwItems->currentIndex()!=-1)
    {
        ui->cmbItems->addItem(QString::number(ui->cmbItems->count()+1));
        CIntLinTr * i=newItem();
        ui->stwItems->insertWidget(ui->stwItems->currentIndex(),i);
        slot_fileChanged();
        watchItem(i);
    }
}

void CTranslat::on_btPasteAfter_clicked()
{
    if(cut_id>-1)
    {
        if(ui->stwItems->currentIndex()!=-1&&ui->cmbItems->currentIndex()!=-1)
        {
            ui->stwItems->addWidget(ui->stwItems->widget(cut_id));
            //ui->stwItems->insertWidget(ui->stwItems->currentIndex(),ui->stwItems->widget(cut_id));
            ui->stwItems->setCurrentIndex(ui->cmbItems->currentIndex());
        }
        stornoCut();
        slot_fileChanged();
    }
}

void CTranslat::slot_dictionaryRequested(short table,int id,QString gword)
{
    if(table==1||table==2)
    {
        if(!coptdic)
        {
            coptdic=new CWordPreview(messages);
            //coptdic->setAttribute(Qt::WA_DeleteOnClose,false);
            coptdic->setWindowTitle(tr("copt transl | coptic dict"));

            //wcoptdic.setWidget(coptdic);
            //messages->settings().mdiArea()->addSubWindow(&wcoptdic);
            //wcoptdic.setWindowIcon(QIcon(":/new/icons/icons/gima.png"));
            //wcoptdic.setWindowTitle("copt transl | coptic dict");
            coptdic->show();
        }
        else
        {
            /*if(wcoptdic.isVisible())
                messages->settings().mdiArea()->setActiveSubWindow(&wcoptdic);
            else*/
                coptdic->show();
        }

        coptdic->queryId(table,id);
        coptdic->showPage(CWordPreview::Search);
        //coptdic->activateWindow();
    }
    else if(table==4)
    {
        if(!gdic)
        {
            gdic=new CLSJ(messages);
            //gdic->setAttribute(Qt::WA_DeleteOnClose,false);
            gdic->setWindowTitle(tr("copt transl | greek dict"));

            //wgdic.setWidget(gdic);
            //messages->settings().mdiArea()->addSubWindow(&wgdic);
            //wgdic.setWindowIcon(QIcon(":/new/icons/icons/alfa2.png"));
            //wgdic.setWindowTitle("copt transl | greek dict");
            gdic->show();
        }
        else
        {
            /*if(wgdic.isVisible())
                messages->settings().mdiArea()->setActiveSubWindow(&wgdic);
            else*/
                gdic->show();
        }

        /*gdic->prepareParse(gword);
        gdic->parse();*/
        gdic->directSearch(gword);
        //gdic->activateWindow();
    }
}

void CTranslat::slot_grammarRequested(QString text)
{
    if(!gramm)
    {
        gramm=new CGrammar(messages);
        //gramm->setAttribute(Qt::WA_DeleteOnClose,false);
        gramm->setWindowTitle(tr("copt transl | grammar"));

        //wgramm.setWidget(gramm);
        //messages->settings().mdiArea()->addSubWindow(&wgramm);
        //wgramm.setWindowIcon(QIcon(":/new/icons/icons/book.png"));
        //wgramm.setWindowTitle("copt transl | grammar");
        gramm->show();
    }
    else
    {
        /*if(wgramm.isVisible())
            messages->settings().mdiArea()->setActiveSubWindow(&wgramm);
        else*/
            gramm->show();
    }

    gramm->scrollToParagraph(text);
    gramm->activateWindow();
}

void CTranslat::on_btSplitText_clicked()
{
    bool st(ui->cbSelTextOnly->isChecked());
    QStringList all;
    if(st)
    {
        all=ui->txtEntireText->textCursor().selectedText().split(ui->cmbTxtSep->currentText(),QString::KeepEmptyParts);
    }
    else
    {
        if(!clearInter())
            return;
        all=ui->txtEntireText->toPlainText().split(ui->cmbTxtSep->currentText(),QString::KeepEmptyParts);
    }

    USE_CLEAN_WAIT

    for(int x=0;x<all.count();x++)
    {
        CIntLinTr * ni=appendItem();
        ni->setRaw(all[x]);
    }
    ui->tabData->setCurrentIndex(2);

}

bool CTranslat::clearInter()
{
    QMessageBox mb(QMessageBox::Question,tr("deleting items"),tr("all data will be lost.\ncontinue?"),QMessageBox::Yes|QMessageBox::No,this);
    if(mb.exec()==QMessageBox::Yes)
    {
        while(removeCurrentItem()>0);
        stornoCut();
        return true;
    }
    else return false;
}

void CTranslat::slot_fontChanged(CTranslit::Script uf, QFont f)
{
    QString s;
    switch(uf)
    {
        case CTranslit::Copt :
        {
            ui->txtEntireText->setFont(f);

            s=tr("Coptic");
            break;
        }
        case CTranslit::Latin :
        {
            ui->txtAbout->setFont(f);
            ui->txtEntireTr->setFont(f);
            ui->txtTitle->setFont(f);

            s=tr("Latin");
            break;
        }
        case CTranslit::Greek :
        {
            s=tr("Greek");
            break;
        }
        case CTranslit::Hebrew :
        {
            s=tr("Hebrew");
            break;
        }
    }
    messages->MsgMsg(windowTitle()+": "+s+tr(" font changed"));
}

void CTranslat::stornoCut()
{
    cut_id=-1;
    ui->btCut->setChecked(false);
}


void CTranslat::on_btExport_clicked()
{
    QString fn;
    if(filename.isEmpty())
        fn=QDir::toNativeSeparators("data/save/new.ilt.html");
    else
        fn=QString(filename+".html");

    ed.setFilename(fn);
    ed.setEn(ui->rbEnC->isChecked());
    if(ed.exec()==QDialog::Accepted)
    {
        USE_CLEAN_WAIT

        QFont cf(messages->settings().font(CTranslit::Copt));
        cf.setPointSize(messages->settings().fontSize(CTranslit::Copt));
        QFont lf(messages->settings().font(CTranslit::Latin));
        lf.setPointSize(messages->settings().fontSize(CTranslit::Latin));

        QFile f(ed.filename());

        CIntLinTr::Transl lang(ed.langCz()?CIntLinTr::Czech:CIntLinTr::English);
        bool const lweb(ed.linksToWWW());

        if(f.open(QIODevice::WriteOnly))
        {
            QString itt,entt,shrt2,shrt3,enttrans(ui->txtEntireTr->toPlainText().trimmed());

            for(int x=0;x<ui->stwItems->count();x++)
            {
                CIntLinTr * i((CIntLinTr *)ui->stwItems->widget(x));
                itt.append(i->asHtml(lang,entt,enttrans,lweb,(ed.longTr()?0:&shrt2),(ed.longTr()?0:&shrt3))+"\n");
            }
            if(!ed.longTr())
            {
                QRegExp r(">[0-9]+<");
                r.setMinimal(true);
                QStringList sh1(shrt2.split(r));
                QString shnew;
                for(int x=0;x<sh1.count()-1;x++)
                {
                    QString s(sh1.at(x));
                    s.replace("href","name=\"n"+QString::number(x+1)+"\" href");
                    shnew.append(s+">["+QString::number(x+1)+"]<");
                }
                shnew.append(sh1.last());
                shrt2=shnew;

                QRegExp r2(">\\[[0-9]+\\]");
                r2.setMinimal(true);
                QStringList sh2(shrt3.split(r2));
                QString shnew2;
                for(int x=0;x<sh2.count()-1;x++)
                {
                    QString s(sh2.at(x));
                    s.replace("<a","<a href=\"#n"+QString::number(x+1)+"\">[&uarr;&uarr;]</a> <a");
                    shnew2.append(s+">["+QString::number(x+1)+"]");
                }
                shnew2.append(sh2.last());
                shrt3=shnew2;
            }

            QString tabout,ttitle;
            switch(lang)
            {
            case CIntLinTr::Czech :
                {
                    QRegExp r("<czech>.*</czech>");
                    QString t(ui->txtAbout->toPlainText());
                    if(r.indexIn(t)!=-1)
                    {
                        tabout=r.cap(0);
                        tabout.remove(QRegExp("(<czech>|</czech>)"));
                        tabout=tabout.trimmed();
                    }

                    QString ti(ui->txtTitle->text());
                    if(r.indexIn(ti)!=-1)
                    {
                        ttitle=r.cap(0);
                        ttitle.remove(QRegExp("(<czech>|</czech>)"));
                        ttitle=ttitle.trimmed();
                    }
                    break;
                }
            case CIntLinTr::English :
                {
                    QRegExp r("<english>.*</english>");
                    QString t(ui->txtAbout->toPlainText());
                    if(r.indexIn(t)!=-1)
                    {
                        tabout=r.cap(0);
                        tabout.remove(QRegExp("(<english>|</english>)"));
                        tabout=tabout.trimmed();
                    }

                    QString ti(ui->txtTitle->text());
                    if(r.indexIn(ti)!=-1)
                    {
                        ttitle=r.cap(0);
                        ttitle.remove(QRegExp("(<english>|</english>)"));
                        ttitle=ttitle.trimmed();
                    }
                    break;
                }
            }

            /*QStringList etl(ui->txtEntireText->toPlainText().split("\n",QString::KeepEmptyParts));
            for(int x=0;x<etl.count();x++)
            {
                QString t(etl[x].trimmed());
                QRegExp r("^\\([0-9]+/[0-9]+\\)");
                r.setMinimal(true);
                int i(r.indexIn(t));
                if(i!=-1)
                {
                    QString s(r.cap(0));
                    t.remove(r);
                    etl[x]=QString("<a href=\"#"+s+"\">"+s+"</a>"+t);
                }
            }*/


            QString t(ed.longTr()?tmpl1:tmpl1_simple);
            QString t2c(tmpl2)/*,t2l(tmpl2),*//*th1(tmpl_header1),th2(tmpl_header2)*/;

            t.replace("(*inf*)",ed.langEn()?tmpl_inf_en:tmpl_inf_cz);
            t.replace("(*lang*)",ed.langEn()?QString("en-US"):QString("cs"));
            t.replace("(*robots*)",ed.robots());
            //t.replace("(*lfontf*)",lf.family());
            t.replace("(*cfontf*)",cf.family());
            t.replace("(*lfonts*)",QString::number(lf.pointSize()));

            /*th1.replace("(*cfontf*)",cf.family());
            th1.replace("(*cfonts*)",QString::number(cf.pointSize()));

            th2.replace("(*cfontf*)",cf.family());
            th2.replace("(*cfonts*)",QString::number(cf.pointSize()));*/

            t2c.replace("(*fontf*)",cf.family());
            t2c.replace("(*fonts*)",QString::number(cf.pointSize()));
            /*t2l.replace("(*fontf*)",lf.family());
            t2l.replace("(*fonts*)",QString::number(lf.pointSize()));*/

            t.replace("(*fontf*)",lf.family());
            t.replace("(*fonts*)",QString::number(lf.pointSize()));
            t.replace("(*title*)",ttitle);
            t.replace("(*about*)",tabout);
            t.replace("(*enttxt*)",QString(t2c).replace("(*text*)",entt.replace("\n","<br>")));
            t.replace("(*entintr*)",itt);
            if(ed.longTr())
                t.replace("(*enttr*)",enttrans);
            else {
                t.replace("(*enttr*)",shrt2);
                t.replace("(*comment*)",shrt3); }

            /*t.replace("(*header1*)",th1);
            t.replace("(*header2*)",th2);*/

            t.replace("(*tblbg*)",ed.tblBgColor());
            t.replace("(*tblfg*)",ed.tblFgColor());
            t.replace("(*commbg*)",ed.tblBgColor());
            t.replace("(*commfg*)",ed.tblFgColor());
            t.replace("(*hdrbg*)",ed.hdrBgColor());
            t.replace("(*hdrfg*)",ed.hdrFgColor());
            t.replace("(*txtbg*)",ed.textBgColor());
            t.replace("(*txtfg*)",ed.textFgColor());
            t.replace("(*itembg*)",ed.itemBgColor());
            t.replace("(*itemfg*)",ed.itemFgColor());

            resolveTags(t,lweb);

            if(f.write(t.toUtf8())==-1)
            {
                f.close();
                messages->MsgErr(tr("cannot write into file '")+ed.filename()+"'");
                return;
            }



            f.close();
        }
        else
        {
            messages->MsgErr(tr("cannot open file '")+ed.filename()+"' for writing");
            return;
        }

        messages->MsgInf(tr("file '")+ed.filename()+tr("' created"));
        messages->MsgOk();
    }
}

void CTranslat::on_btComplTr_clicked()
{
    QString all("<table><tbody>");
    CIntLinTr::Transl t(ui->rbCzC->isChecked()?CIntLinTr::Czech:CIntLinTr::English);
    for(int x=0;x<ui->stwItems->count();x++)
    {
        CIntLinTr * i((CIntLinTr *)ui->stwItems->widget(x));
        all.append(i->getFinal(t)+"\n");
    }
    all.append("</tbody></table>");
    ui->txtEntireTr->setPlainText(all);
}

void CTranslat::on_btDelSep_clicked()
{
    if(ui->cbSelTextOnly->isChecked())
    {
        QString t(ui->txtEntireText->textCursor().selectedText());
        t.remove(ui->cmbTxtSep->currentText());
        ui->txtEntireText->textCursor().removeSelectedText();
        ui->txtEntireText->textCursor().insertText(t);
    }
    else
    {
        QString t(ui->txtEntireText->toPlainText());
        t.remove(ui->cmbTxtSep->currentText());
        ui->txtEntireText->setPlainText(t);
    }
}

void CTranslat::resolveTags(QString & text,bool links_to_www) const
{
    QRegExp r("<cop>.*</cop>"),
        rg("<gk>.*</gk>"),
        ri("<id>.*</id>");
    r.setMinimal(true);
    rg.setMinimal(true);
    ri.setMinimal(true);

    static QString const spanc("(*txt*)"),spang("(*txt*)");

    QString const target(links_to_www?"http://marcion.sourceforge.net/view.php?id=":QString());

    int i=0;
    while((i=r.indexIn(text,i))!=-1)
    {
        QString s(r.cap(0));
        s.remove(QRegExp("^<cop>"));
        s.remove(QRegExp("</cop>$"));
        s=CTranslit::tr(s,CTranslit::CopticTrToCopticN,false,CTranslit::RemoveNone);
        text.replace(i,r.matchedLength(),QString(spanc).replace("(*txt*)",s));
    }

    i=0;
    while((i=rg.indexIn(text,i))!=-1)
    {
        QString s(rg.cap(0));
        s.remove(QRegExp("^<gk>"));
        s.remove(QRegExp("</gk>$"));
        s=CTranslit::tr(s,CTranslit::GreekTrToGreekN,false,CTranslit::RemoveNone);
        text.replace(i,rg.matchedLength(),QString(spang).replace("(*txt*)",s));
    }

    i=0;
    while((i=ri.indexIn(text,i))!=-1)
    {
        QString s(ri.cap(0));
        s.remove(QRegExp("^<id>"));
        s.remove(QRegExp("</id>$"));

        text.replace(i,ri.matchedLength(),QString("<a href=\""+target+s+"\" target=\"_blank\">"+s+"</a>"));
    }
}

void CTranslat::slot_clipboardData(QStringList * data,bool from)
{
    if(from)
        *data=clipb;
    else
        clipb=*data;

    //messages->MsgMsg(clipb.join("; "));
}

void CTranslat::watchItem(CIntLinTr * item)
{
    connect(item,SIGNAL(changed()),this,SLOT(slot_fileChanged()));
}

void CTranslat::slot_fileChanged()
{
    changed=true;
    if(!ui->btSave->isEnabled())
        ui->btSave->setEnabled(true);
}

void CTranslat::fileSaved()
{
    changed=false;
    ui->btSave->setEnabled(false);
}

void CTranslat::on_txtTitle_textChanged(QString )
{
    slot_fileChanged();
}

void CTranslat::on_txtAbout_textChanged()
{
    slot_fileChanged();
}

void CTranslat::on_txtEntireText_textChanged()
{
    slot_fileChanged();
}
